import { getBrowserProvider } from "../browser";
import { Store } from "../store";
import type { Env, ExecutionContextLike, ExtractRequest, ScrapeDocument } from "../types";
import { json, readJson } from "../utils/http";
import { newId } from "../utils/ids";

const MAX_EXTRACT_URLS = 10;

export async function handleExtract(
  request: Request,
  env: Env,
  ctx: ExecutionContextLike,
  _path: string,
): Promise<Response> {
  const body = await readJson<Partial<ExtractRequest>>(request);
  const parse = parseExtractInput(body);
  if (!parse.ok) {
    const firstIssue = parse.issues[0];
    const message = firstIssue?.message ?? "Bad Request";
    return json(
      {
        success: false,
        code: "BAD_REQUEST",
        error: message,
        details: parse.issues,
      },
      { status: 400 },
    );
  }

  const { urls, invalidURLs, scrapeOptions, prompt } = parse.value;
  const id = newId("extract");
  const store = new Store(env);
  await store.createJob(id, "extract", {
    urls,
    prompt,
    ignoreInvalidURLs: body.ignoreInvalidURLs,
    scrapeOptions,
  });
  await store.markJobRunning(id);

  ctx.waitUntil(
    runExtractJob({
      env,
      store,
      id,
      urls,
      invalidURLs,
      scrapeOptions,
    }),
  );

  return json({
    success: true,
    id,
    ...(invalidURLs.length > 0 ? { invalidURLs } : {}),
    urlTrace: [],
  });
}

export async function handleExtractStatus(env: Env, id: string): Promise<Response> {
  if (!UUID_RE.test(id)) {
    return json(
      {
        success: false,
        error: "Invalid job ID format. Job ID must be a valid UUID.",
      },
      { status: 400 },
    );
  }

  const store = new Store(env);
  const job = await store.getJobRecord(id);
  if (!job || job.kind !== "extract") {
    return json({ success: false, error: "Job not found." }, { status: 404 });
  }

  const result = await store.getJobResult<{
    status?: string;
    data?: unknown[];
    invalidURLs?: string[];
    total?: number;
    completed?: number;
    warnings?: string[];
    replacement?: string;
    urlTrace?: string[];
    expiresAt?: string;
    creditsUsed?: number;
    tokensUsed?: number;
  }>(id);
  const status = normalizeStatusForClient(job.status);

  if (!result) {
    return json({
      success: status !== "failed" && status !== "cancelled",
      status,
      ...(job.error ? { error: job.error } : {}),
    });
  }

  return json({
    ...result,
    success: status !== "failed" && status !== "cancelled",
    status,
  });
}

async function runExtractJob(parameters: {
  env: Env;
  store: Store;
  id: string;
  urls: string[];
  invalidURLs: string[];
  scrapeOptions: ExtractRequest["scrapeOptions"];
}): Promise<void> {
  const { env, store, id, urls, invalidURLs, scrapeOptions } = parameters;

  if (urls.length === 0) {
    await store.saveJobResult(
      id,
      {
        status: "processing",
        data: [],
        total: 0,
        completed: 0,
        ...(invalidURLs.length > 0 ? { invalidURLs } : {}),
        urlTrace: [],
        tokensUsed: 0,
        creditsUsed: 0,
        expiresAt: getExpiresAt(),
      },
      "processing",
    );
    return;
  }

  const provider = getBrowserProvider(env, scrapeOptions);
  const outputs: unknown[] = [];
  for (const url of urls) {
    try {
      const doc = await provider.scrape({
        url,
        ...(scrapeOptions ?? {}),
      });
      outputs.push(buildExtractPayload(doc));
    } catch (error) {
      outputs.push({
        url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const status = outputs.length > 0 ? "completed" : "failed";

  await store.saveJobResult(
    id,
      {
        status,
        data: outputs,
        total: outputs.length,
        completed: outputs.length,
        ...(invalidURLs.length > 0 ? { invalidURLs } : {}),
        urlTrace: [],
        tokensUsed: 0,
        creditsUsed: Math.max(1, outputs.length),
      expiresAt: getExpiresAt(),
    },
    status === "failed" ? "failed" : "completed",
  );
}

function parseExtractInput(body: Partial<ExtractRequest>): {
  ok: boolean;
  value: {
    urls: string[];
    invalidURLs: string[];
    scrapeOptions: ExtractRequest["scrapeOptions"];
    prompt?: string;
  };
  issues: Array<{ code: string; path: Array<string | number>; message: string }>;
} {
  const issues: Array<{ code: string; path: Array<string | number>; message: string }> = [];
  const ignoreInvalidURLs = body.ignoreInvalidURLs ?? true;

  if (body.ignoreInvalidURLs !== undefined && typeof body.ignoreInvalidURLs !== "boolean") {
    issues.push({
      code: "invalid_type",
      path: ["ignoreInvalidURLs"],
      message: "ignoreInvalidURLs must be a boolean.",
    });
  }

  const hasPrompt = typeof body.prompt === "string" && body.prompt.length > 0;
  const hasUrls = body.urls !== undefined;
  const rawUrls = Array.isArray(body.urls) ? body.urls : [];
  const urls: string[] = [];
  const invalidURLs: string[] = [];
  const prompt = typeof body.prompt === "string" ? body.prompt : "";

  if (body.urls !== undefined && !Array.isArray(body.urls)) {
    issues.push({
      code: "invalid_type",
      path: ["urls"],
      message: "urls must be an array of URLs.",
    });
  }

  for (const [index, raw] of rawUrls.slice(0, MAX_EXTRACT_URLS).entries()) {
    if (typeof raw !== "string") {
      invalidURLs.push(String(raw));
      issues.push({
        code: "custom",
        path: ["urls", index],
        message: "URL must have a valid top-level domain or be a valid path",
      });
      continue;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      invalidURLs.push(raw);
      issues.push({
        code: "custom",
        path: ["urls", index],
        message: "URL must have a valid top-level domain or be a valid path",
      });
      continue;
    }

    if (!isValidTargetUrl(trimmed)) {
      invalidURLs.push(raw);
      issues.push({
        code: "custom",
        path: ["urls", index],
        message: "URL must have a valid top-level domain or be a valid path",
      });
      continue;
    }

    urls.push(new URL(trimmed).toString());
  }

  const extraUrls = Math.max(0, rawUrls.length - MAX_EXTRACT_URLS);
  if (extraUrls > 0) {
    issues.push({
      code: "too_big",
      path: ["urls"],
      message: `Maximum of ${MAX_EXTRACT_URLS} URLs allowed per request while in beta.`,
    });
  }

  if (body.prompt !== undefined && typeof body.prompt !== "string") {
    issues.push({
      code: "invalid_type",
      path: ["prompt"],
      message: "prompt must be a string.",
    });
  }

  if (!hasUrls && !hasPrompt) {
    issues.push({
      code: "custom",
      path: [],
      message: "Either 'urls' or 'prompt' must be provided.",
    });
  }

  if (issues.length > 0 && invalidURLs.length > 0) {
    return {
      ok: false,
      value: {
        urls: [],
        invalidURLs,
        scrapeOptions: buildExtractScrapeOptions(body),
        prompt: typeof body.prompt === "string" ? body.prompt : prompt,
      },
      issues,
    };
  }

  if (issues.length > 0) {
    return {
      ok: false,
      value: {
        urls: [],
        invalidURLs,
        scrapeOptions: buildExtractScrapeOptions(body),
        prompt: typeof body.prompt === "string" ? body.prompt : prompt,
      },
      issues,
    };
  }

  return {
    ok: true,
    value: {
      urls,
      invalidURLs,
      scrapeOptions: buildExtractScrapeOptions(body),
      prompt: typeof body.prompt === "string" ? body.prompt : undefined,
    },
    issues: [],
  };
}

function buildExtractScrapeOptions(body: Partial<ExtractRequest>): ExtractRequest["scrapeOptions"] {
  return body.scrapeOptions ?? {
    formats: ["json", "markdown"],
    jsonPrompt: body.prompt ?? "Extract structured data from this page.",
    timeout: body.timeout,
  };
}

function isValidTargetUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname;
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host);
  } catch {
    return false;
  }
}

function buildExtractPayload(document: ScrapeDocument): Record<string, unknown> {
  if (document.json !== undefined) {
    if (document.json && typeof document.json === "object") {
      return document.json as Record<string, unknown>;
    }
    return { result: document.json };
  }

  return {
    url: document.url,
    markdown: document.markdown,
    title: document.title,
  };
}

function normalizeStatusForClient(status: string): "queued" | "processing" | "completed" | "failed" | "cancelled" {
  if (status === "running" || status === "queued") return "processing";
  if (status === "cancelled") return "cancelled";
  if (status === "failed") return "failed";
  if (status === "completed") return "completed";
  return "processing";
}

function getExpiresAt(): string {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return expiresAt.toISOString();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
