import { getBrowserProvider } from "../browser";
import type { BrowserProvider } from "../browser/types";
import { getCached, putCached } from "../cache";
import { Store } from "../store";
import type {
  BatchScrapeQueueMessage,
  BatchScrapeRequest,
  CrawlError,
  CrawlQueueMessage,
  CrawlRequest,
  CrawlResult,
  CloudflareQueueMessage,
  Env,
  ExecutionContextLike,
  OutputFormat,
  ScrapeDocument,
  ScrapeRequest,
} from "../types";
import { mapWithConcurrency } from "../utils/concurrency";
import { clampInt, json, readJson, requireString, sameOriginOrAbsoluteUrl } from "../utils/http";
import { newId } from "../utils/ids";

interface UrlOutcome {
  url: string;
  index: number;
  document?: ScrapeDocument;
  error?: string;
}

/**
 * Scrape a set of URLs with bounded concurrency, checking the edge cache first
 * and writing fresh results back. Providers that support session reuse
 * (`scrapeMany`, e.g. Kernel) drain cache misses through one pooled session;
 * others fall back to a concurrent `provider.scrape` map. `onSettled` fires per
 * URL for incremental progress. Results preserve input order.
 */
async function scrapeUrls(
  env: Env,
  provider: BrowserProvider,
  urls: string[],
  options: Omit<ScrapeRequest, "url">,
  concurrency: number,
  onSettled?: (outcome: UrlOutcome) => Promise<void> | void,
): Promise<UrlOutcome[]> {
  const outcomes = new Array<UrlOutcome>(urls.length);
  const missIndexes: number[] = [];

  const settle = async (outcome: UrlOutcome): Promise<void> => {
    outcomes[outcome.index] = outcome;
    if (onSettled) await onSettled(outcome);
  };

  // 1. Resolve cache hits up front.
  await Promise.all(
    urls.map(async (url, index) => {
      const cached = await getCached(env, { ...options, url });
      if (cached) await settle({ url, index, document: cached });
      else missIndexes.push(index);
    }),
  );

  const missUrls = missIndexes.map(i => urls[i]!);
  if (missUrls.length === 0) return outcomes;

  // 2. Scrape cache misses.
  if (provider.scrapeMany) {
    const results = await provider.scrapeMany(missUrls, options, concurrency);
    for (let k = 0; k < results.length; k++) {
      const result = results[k]!;
      const index = missIndexes[k]!;
      if (result.document) await putCached(env, { ...options, url: result.url }, result.document);
      await settle({ url: result.url, index, document: result.document, error: result.error });
    }
  } else {
    await mapWithConcurrency(missUrls, concurrency, async (url, k) => {
      const index = missIndexes[k]!;
      const req: ScrapeRequest = { ...options, url };
      try {
        const document = await provider.scrape(req);
        await putCached(env, req, document);
        await settle({ url, index, document });
      } catch (error) {
        await settle({ url, index, error: error instanceof Error ? error.message : String(error) });
      }
    });
  }

  return outcomes;
}

const CRAWL_COMPLETED_STATUSES = new Set(["completed", "failed", "cancelled"]);

export async function handleCrawl(request: Request, env: Env, ctx: ExecutionContextLike): Promise<Response> {
  const body = await readJson<Partial<CrawlRequest>>(request);
  const url = sameOriginOrAbsoluteUrl(requireString(body.url, "url")).toString();
  const crawlRequest: CrawlRequest = {
    url,
    limit: clampInt(body.limit, 5, 1, 25),
    maxDepth: clampInt(body.maxDepth, 1, 0, 3),
    scrapeOptions: body.scrapeOptions ?? { formats: ["markdown"] },
    async: body.async ?? false,
    concurrency: clampInt(body.concurrency, 5, 1, 10),
  };
  const id = newId("crawl");
  const store = new Store(env);
  await store.createJob(id, "crawl", crawlRequest);

  if (crawlRequest.async) {
    await env.CRAWL_QUEUE.send({ id, type: "crawl", request: crawlRequest });
    await setDurableStatus(env, id, { id, status: "queued", total: 0, completed: 0 });
    await store.markJobRunning(id);
    return json({ success: true, id, status: "queued", url: `/crawl/${id}` });
  }

  const result = await runCrawl(id, crawlRequest, env);
  ctx.waitUntil(setDurableStatus(env, id, result));
  return json({ success: result.status === "completed", ...result });
}

export async function handleBatchScrape(
  request: Request,
  env: Env,
  _ctx: ExecutionContextLike,
): Promise<Response> {
  const body = await readJson<Partial<BatchScrapeRequest>>(request);
  const urls = normalizeUrls(body.urls, body.ignoreInvalidURLs ?? false);
  if (!Array.isArray(urls.valid) || urls.valid.length === 0) {
    return json(
      {
        success: false,
        error: urls.reason,
      },
      { status: 400 },
    );
  }

  const id = newId("batch-scrape");
  const batchRequest: BatchScrapeRequest = {
    urls: urls.valid,
    ignoreInvalidURLs: body.ignoreInvalidURLs ?? false,
    scrapeOptions: body.scrapeOptions ?? { formats: ["markdown"] },
    webhook: body.webhook,
    maxConcurrency: clampInt(body.maxConcurrency, 1, 1, 25),
  };

  const store = new Store(env);
  await store.createJob(id, "batch_scrape", batchRequest);
  await store.markJobRunning(id);
  await store.saveJobResult(
    id,
    {
      id,
      status: "processing",
      total: urls.valid.length,
      completed: 0,
      data: [],
      ...(urls.invalid.length > 0 ? { errors: [] } : {}),
    },
    "processing",
  );
  await setDurableStatus(env, id, {
    id,
    status: "queued",
    total: urls.valid.length,
    completed: 0,
  });
  await env.CRAWL_QUEUE.send({ id, type: "batch-scrape", request: batchRequest });
  return json({
    success: true,
    id,
    status: "queued",
    data: urls.invalid.length > 0 ? { invalidURLs: urls.invalid } : undefined,
  });
}

export async function handleCrawlStatus(request: Request, env: Env, id: string): Promise<Response> {
  const objectId = env.JOB_STATUS.idFromName(id);
  const response = await env.JOB_STATUS.get(objectId).fetch(new Request("https://job/status"));
  if (response.status !== 404) {
    const payload = await response.json<Record<string, unknown>>();
    const wrappedStatus = payload && typeof payload === "object" && "data" in payload ? (payload.data as Record<string, unknown> | undefined) : payload;
    if (wrappedStatus && typeof wrappedStatus === "object" && "status" in wrappedStatus) {
      const statusValue = normalizeStatusForClient(String(wrappedStatus.status));
      return json({
        ...(wrappedStatus as Record<string, unknown>),
        status: statusValue,
      });
    }
  }

  const store = new Store(env);
  const job = await store.getJobRecord(id);
  if (!job || job.kind !== "crawl") {
    return json({ success: false, error: "Job not found" }, { status: 404 });
  }

  const result = await store.getJobResult<CrawlResult>(id);
  if (!result) {
    return json({
      success: job.status === "completed",
      id,
      status: normalizeStatusForClient(job.status),
      total: 0,
      completed: 0,
      data: [],
    });
  }

  return json({
    ...result,
    success: normalizeStatusForClient(result.status) === "completed",
    status: normalizeStatusForClient(result.status),
  });
}

export async function handleBatchScrapeStatus(env: Env, id: string): Promise<Response> {
  const store = new Store(env);
  const job = await store.getJobRecord(id);
  if (!job || job.kind !== "batch_scrape") {
    return json({ success: false, error: "Batch scrape not found" }, { status: 404 });
  }

  const result = await store.getJobResult<CrawlResult>(id);
  if (!result) {
    return json({
      success: job.status === "completed",
      id,
      status: normalizeStatusForClient(job.status),
      total: 0,
      completed: 0,
      data: [],
      errors: [],
    });
  }

  return json({
    success: normalizeStatusForClient(result.status) === "completed",
    ...(result as unknown as Record<string, unknown>),
    status: normalizeStatusForClient(result.status),
  });
}

export async function handleBatchScrapeCancel(env: Env, id: string): Promise<Response> {
  const store = new Store(env);
  const job = await store.getJobRecord(id);
  if (!job || job.kind !== "batch_scrape") {
    return json({ success: false, error: "Batch scrape not found" }, { status: 404 });
  }

  if (CRAWL_COMPLETED_STATUSES.has(job.status)) {
    return json(
      {
        success: true,
        status: normalizeStatusForClient(job.status),
      },
      { status: 200 },
    );
  }

  await store.cancelJob(id, "cancelled");
  await setDurableStatus(env, id, {
    id,
    status: "cancelled",
    total: 0,
    completed: 0,
    data: [],
    errors: [],
  });
  return json({ success: true, status: "cancelled" });
}

export async function handleCrawlCancel(env: Env, id: string): Promise<Response> {
  const store = new Store(env);
  const job = await store.getJobRecord(id);
  if (!job || job.kind !== "crawl") {
    return json({ success: false, error: "Crawl not found" }, { status: 404 });
  }

  if (CRAWL_COMPLETED_STATUSES.has(job.status)) {
    return json({
      status: normalizeStatusForClient(job.status),
    });
  }

  await store.cancelJob(id, "cancelled");
  await setDurableStatus(env, id, {
    id,
    status: "cancelled",
    total: 0,
    completed: 0,
    data: [],
    errors: [],
  });
  return json({ status: "cancelled" });
}

export async function handleCrawlErrors(env: Env, id: string): Promise<Response> {
  const store = new Store(env);
  const job = await store.getJobRecord(id);
  if (!job || (job.kind !== "crawl" && job.kind !== "batch_scrape")) {
    return json({ success: false, error: "Job not found" }, { status: 404 });
  }

  const result = await store.getJobResult<{ errors?: CrawlError[] }>(id);
  const errors = result?.errors ?? [];
  return json({
    errors,
    robotsBlocked: [],
  });
}

export async function handleCrawlOngoing(env: Env): Promise<Response> {
  const store = new Store(env);
  const records = await store.getJobsByKindsAndStatus(["crawl", "batch_scrape"], ["running", "queued"]);
  const crawls = records
    .map(record => {
      let input: { url?: string } | null = null;
      try {
        input = JSON.parse(record.input_json) as { url?: string };
      } catch {
        input = null;
      }
      return {
        id: record.id,
        status: normalizeStatusForClient(record.status),
        created_at: record.created_at,
        url: input?.url,
        kind: record.kind,
      };
    })
    .filter(x => x.url);

  return json({
    success: true,
    crawls: crawls.map(({ id, status, created_at, url, kind }) => ({
      id,
      status,
      created_at,
      url,
      kind,
    })),
  });
}

export async function consumeCrawlQueue(batch: MessageBatch<CloudflareQueueMessage>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    try {
      const store = new Store(env);
      await store.markJobRunning(message.body.id);
      if (await store.getJobStatus(message.body.id) === "cancelled") {
        await setDurableStatus(env, message.body.id, { id: message.body.id, status: "cancelled", total: 0, completed: 0 });
        message.ack();
        continue;
      }

      let result: CrawlResult;
      if (message.body.type === "batch-scrape") {
        result = await runBatchScrape(message.body.id, message.body.request, env);
      } else {
        result = await runCrawl(message.body.id, message.body.request, env);
      }

      await setDurableStatus(env, message.body.id, result);
      message.ack();
    } catch (error) {
      const messageError = error instanceof Error ? error.message : String(error);
      await storeStatusFailure(env, message.body.id, messageError);
      message.retry();
    }
  }
}

export async function runCrawl(id: string, request: CrawlRequest, env: Env): Promise<CrawlResult> {
  const store = new Store(env);
  await store.markJobRunning(id);

  const limit = request.limit ?? 5;
  const maxDepth = request.maxDepth ?? 1;
  const concurrency = Math.max(1, Math.min(request.concurrency ?? 5, 10));
  const provider = getBrowserProvider(env, request.scrapeOptions);
  const origin = new URL(request.url).origin;

  // Always request links so BFS link discovery works regardless of the caller's
  // chosen formats; this is cheaper than a separate links round-trip per page.
  const options = { ...(request.scrapeOptions ?? { formats: ["markdown"] }) } as Omit<ScrapeRequest, "url">;
  if (maxDepth > 0) {
    const formats = new Set<OutputFormat>(options.formats ?? ["markdown"]);
    formats.add("links");
    options.formats = [...formats];
  }

  const seen = new Set<string>([request.url]);
  const documents: ScrapeDocument[] = [];
  const errors: CrawlError[] = [];
  let frontier = [request.url];
  let depth = 0;

  while (frontier.length > 0 && documents.length < limit) {
    if (await store.getJobStatus(id) === "cancelled") {
      const result: CrawlResult = {
        id,
        status: "cancelled",
        total: limit,
        completed: documents.length,
        data: documents,
        errors,
      };
      await store.saveJobResult(id, result, "cancelled");
      return result;
    }

    const wave = frontier.slice(0, limit - documents.length);
    const outcomes = await scrapeUrls(env, provider, wave, options, concurrency);

    const nextFrontier: string[] = [];
    for (const outcome of outcomes) {
      if (outcome.document) {
        documents.push(outcome.document);
        await store.saveDocument(id, outcome.document);
        if (depth < maxDepth) {
          for (const link of outcome.document.links ?? []) {
            try {
              const url = new URL(link);
              if (url.origin !== origin) continue;
              const key = url.toString();
              if (!seen.has(key)) {
                seen.add(key);
                nextFrontier.push(key);
              }
            } catch {
              continue;
            }
          }
        }
      } else {
        errors.push({
          id: newId("url"),
          url: outcome.url,
          error: outcome.error ?? "scrape failed",
        });
      }
    }

    await setDurableStatus(env, id, {
      id,
      status: "processing",
      total: limit,
      completed: documents.length,
      errors,
      data: documents,
    });

    frontier = nextFrontier;
    depth++;
  }

  const status = errors.length > 0 && documents.length === 0 ? "failed" : "completed";
  const result: CrawlResult = {
    id,
    status,
    total: limit,
    completed: documents.length,
    data: documents,
    ...(errors.length > 0 ? { errors } : {}),
  };
  await store.saveJobResult(id, result, status);
  return result;
}

export async function runBatchScrape(id: string, request: BatchScrapeRequest, env: Env): Promise<CrawlResult> {
  const store = new Store(env);
  await store.markJobRunning(id);

  const provider = getBrowserProvider(env, request.scrapeOptions);
  const options = request.scrapeOptions ?? { formats: ["markdown"] };
  const concurrency = Math.max(1, Math.min(request.maxConcurrency ?? 5, 25));
  const total = request.urls.length;
  const documents: ScrapeDocument[] = [];
  const errors: CrawlError[] = [];
  let cancelled = false;

  await scrapeUrls(env, provider, request.urls, options, concurrency, async outcome => {
    if (cancelled) return;
    if (await store.getJobStatus(id) === "cancelled") {
      cancelled = true;
      return;
    }
    if (outcome.document) {
      documents.push(outcome.document);
      await store.saveDocument(id, outcome.document);
    } else {
      errors.push({
        id: `${id}-${outcome.index}`,
        url: outcome.url,
        error: outcome.error ?? "scrape failed",
        timestamp: new Date().toISOString(),
      });
    }
    await setDurableStatus(env, id, {
      id,
      status: "processing",
      total,
      completed: documents.length,
      errors,
      data: documents,
    });
  });

  if (cancelled) {
    const result: CrawlResult = {
      id,
      status: "cancelled",
      total,
      completed: documents.length,
      data: documents,
      errors: errors.length ? errors : [],
    };
    await store.saveJobResult(id, result, "cancelled");
    return result;
  }

  const status = errors.length > 0 ? "failed" : "completed";
  const result: CrawlResult = {
    id,
    status,
    total,
    completed: documents.length,
    data: documents,
    ...(errors.length > 0 ? { errors } : {}),
  };
  await store.saveJobResult(id, result, status);
  return result;
}

async function storeStatusFailure(env: Env, id: string, errorMessage: string): Promise<void> {
  const store = new Store(env);
  await store.failJob(id, errorMessage);
  await setDurableStatus(env, id, {
    id,
    status: "failed",
    total: 0,
    completed: 0,
    error: errorMessage,
  });
}

function normalizeStatusForClient(status: string): "queued" | "processing" | "completed" | "failed" | "cancelled" {
  if (status === "running" || status === "queued") return "processing";
  if (status === "cancelled") return "cancelled";
  if (status === "failed") return "failed";
  if (status === "completed") return "completed";
  return "processing";
}

function normalizeUrls(urls: unknown, ignoreInvalid: boolean):
  | { valid: string[]; invalid: string[]; reason?: string }
  | { valid: []; invalid: string[]; reason: string } {
  if (!Array.isArray(urls) || urls.length === 0) {
    return { valid: [], invalid: [], reason: "urls must be a non-empty array" };
  }

  const valid: string[] = [];
  const invalid: string[] = [];
  for (const raw of urls) {
    if (typeof raw !== "string") {
      invalid.push(String(raw));
      continue;
    }

    try {
      valid.push(sameOriginOrAbsoluteUrl(raw).toString());
    } catch {
      invalid.push(raw);
    }
  }

  if (invalid.length > 0 && !ignoreInvalid) {
    return { valid: [], invalid, reason: "Some URLs were invalid. Set ignoreInvalidURLs=true to skip invalid URLs." };
  }

  return { valid, invalid };
}

async function setDurableStatus(env: Env, id: string, value: CrawlResult): Promise<void> {
  const objectId = env.JOB_STATUS.idFromName(id);
  await env.JOB_STATUS.get(objectId).fetch(
    new Request("https://job/status", {
      method: "PUT",
      body: JSON.stringify(value),
      headers: { "content-type": "application/json" },
    }),
  );
}
