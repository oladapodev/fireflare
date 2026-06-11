import { getBrowserProvider } from "../browser";
import { Store } from "../store";
import type { Env, ExecutionContextLike, ScrapeDocument, ScrapeRequest } from "../types";
import { clampInt, json, readJson, requireString, sameOriginOrAbsoluteUrl } from "../utils/http";
import { newId } from "../utils/ids";

export async function handleScrape(
  request: Request,
  env: Env,
  ctx: ExecutionContextLike,
  _path: string,
): Promise<Response> {
  const body = await readJson<Partial<ScrapeRequest>>(request);
  const url = sameOriginOrAbsoluteUrl(requireString(body.url, "url")).toString();
  const jobId = newId("scrape");
  const scrapeRequest: ScrapeRequest = {
    url,
    formats: body.formats ?? ["markdown"],
    onlyMainContent: body.onlyMainContent,
    waitFor: clampInt(body.waitFor, 0, 0, 30000),
    timeout: clampInt(body.timeout, 60000, 1000, 300000),
    browserProvider: body.browserProvider ?? "auto",
    jsonPrompt: body.jsonPrompt,
  };

  const store = new Store(env);
  await store.createJob(jobId, "scrape", scrapeRequest);
  await store.markJobRunning(jobId);

  const provider = getBrowserProvider(env, scrapeRequest);
  const document = await provider.scrape(scrapeRequest);
  document.metadata.jobId = jobId;

  const result = {
    status: "completed",
    data: document,
  } as const;
  ctx.waitUntil(store.saveDocument(jobId, document));
  ctx.waitUntil(store.saveJobResult(jobId, result, "completed"));

  return json({
    success: true,
    data: document,
  });
}

export async function handleScrapeStatus(request: Request, env: Env, id: string): Promise<Response> {
  if (!UUID_RE.test(id)) {
    return json(
      {
        success: false,
        error: "Invalid crawl ID",
      },
      { status: 400 },
    );
  }

  const store = new Store(env);
  const job = await store.getJobRecord(id);
  if (!job || job.kind !== "scrape") {
    return json({ success: false, error: "Job not found." }, { status: 404 });
  }

  const result = await store.getJobResult<{
    id: string;
    status: string;
    data?: ScrapeDocument;
    total?: number;
    completed?: number;
    errors?: unknown;
  }>(id);

  const status = normalizeStatusForClient(job.status);
  if (!result) {
    return json({
      success: status !== "failed" && status !== "cancelled",
      id,
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeStatusForClient(status: string): "queued" | "processing" | "completed" | "failed" | "cancelled" {
  if (status === "running" || status === "queued") return "processing";
  if (status === "cancelled") return "cancelled";
  if (status === "failed") return "failed";
  if (status === "completed") return "completed";
  return "failed";
}
