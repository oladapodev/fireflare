import { getBrowserProvider } from "../browser";
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
  ScrapeDocument,
} from "../types";
import { clampInt, json, readJson, requireString, sameOriginOrAbsoluteUrl } from "../utils/http";
import { newId } from "../utils/ids";

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
  const provider = getBrowserProvider(env, request.scrapeOptions);
  const origin = new URL(request.url).origin;
  const queue = [request.url];
  const seen = new Set<string>();
  const documents: ScrapeDocument[] = [];
  const errors: CrawlError[] = [];

  while (queue.length > 0 && documents.length < limit) {
    const next = queue.shift()!;
    if (seen.has(next)) continue;
    seen.add(next);

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

    try {
      const document = await provider.scrape({
        ...(request.scrapeOptions ?? { formats: ["markdown"] }),
        url: next,
      });
      documents.push(document);
      await store.saveDocument(id, document);
    } catch (error) {
      errors.push({
        id: newId("url"),
        url: next,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if ((request.maxDepth ?? 1) > 0 && documents.length < limit) {
      try {
        const links = documents[documents.length - 1]?.links ?? (await provider.links(next, 100));
        for (const link of links) {
          try {
            const url = new URL(link);
            if (url.origin !== origin) continue;
            if (!seen.has(url.toString())) queue.push(url.toString());
          } catch {
            continue;
          }
        }
      } catch {
        // best-effort link discovery
      }
    }
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
  const documents: ScrapeDocument[] = [];
  const errors: CrawlError[] = [];

  for (let index = 0; index < request.urls.length; index++) {
    const url = request.urls[index]!;

    if (await store.getJobStatus(id) === "cancelled") {
      const result: CrawlResult = {
        id,
        status: "cancelled",
        total: request.urls.length,
        completed: documents.length,
        data: documents,
        errors: errors.length ? errors : [],
      };
      await store.saveJobResult(id, result, "cancelled");
      return result;
    }

    try {
      const document = await provider.scrape({
        ...(request.scrapeOptions ?? { formats: ["markdown"] }),
        url,
      });
      documents.push(document);
      await store.saveDocument(id, document);
    } catch (error) {
      errors.push({
        id: `${id}-${index}`,
        url,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }

    await setDurableStatus(env, id, {
      id,
      status: "processing",
      total: request.urls.length,
      completed: documents.length,
      errors,
      data: documents,
    });
  }

  const status = errors.length > 0 ? "failed" : "completed";
  const result: CrawlResult = {
    id,
    status,
    total: request.urls.length,
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
