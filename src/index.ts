import { JobStatusObject } from "./durable/job-status";
import { fromHono } from "chanfana";
import { Hono } from "hono";
import {
  consumeCrawlQueue,
} from "./handlers/crawl";
import {
  BatchScrapeCancelEndpoint,
  BatchScrapeEndpoint,
  BatchScrapeErrorsEndpoint,
  BatchScrapeStatusEndpoint,
  CrawlCancelEndpoint,
  CrawlEndpoint,
  CrawlErrorsEndpoint,
  CrawlOngoingEndpoint,
  CrawlStatusEndpoint,
  ExtractEndpoint,
  ExtractStatusEndpoint,
  MapEndpoint,
  redirectToDocs,
  ScrapeEndpoint,
  ScrapeStatusEndpoint,
  SearchEndpoint,
  SearchFeedbackEndpoint,
} from "./openapi-routes";
import type { CrawlQueueMessage, Env } from "./types";
import { HttpError, json, notFound } from "./utils/http";

export { JobStatusObject };

const app = new Hono<{ Bindings: Env }>();
const openapi = fromHono(app, {
  docs_url: null,
  redoc_url: null,
  openapi_url: "/openapi.json",
  openapiVersion: "3.1",
  raiseUnknownParameters: false,
  schema: {
    info: {
      title: "Fireflare API",
      version: "1.0.0",
      description: "Cloudflare-native web extraction API. Search web, scrape content, map links, and run crawl jobs.",
    },
    tags: [
      { name: "Scrape", description: "Single-page extraction endpoints" },
      { name: "Extract", description: "Structured extraction jobs" },
      { name: "Search", description: "Web search and search feedback" },
      { name: "Map", description: "Site link discovery" },
      { name: "Crawl", description: "Crawl jobs and crawl status" },
      { name: "Batch", description: "Batch scrape jobs" },
    ],
  },
});

app.get("/", c =>
  c.json({
    name: "Fireflare API",
    runtime: "cloudflare-workers",
    browserProvider: c.env.BROWSER_PROVIDER,
    searchProvider: c.env.SEARCH_PROVIDER,
    docs: c.env.DOCS_SITE || "https://oladapodev.github.io/fireflare",
    openapi: "/openapi.json",
    endpoints: [
      "/v1/scrape",
      "/v1/scrape/:id",
      "/v1/extract",
      "/v1/extract/:id",
      "/v1/search",
      "/v1/map",
      "/v1/batch/scrape",
      "/v1/batch/scrape/:id",
      "/v1/batch/scrape/:id/errors",
      "/v1/crawl",
      "/v1/crawl/:id",
      "/v1/crawl/:id/errors",
      "/v1/crawl/:id (DELETE)",
      "/v1/crawl/ongoing",
      "/v1/crawl/active",
      "/v2/scrape",
      "/v2/scrape/:id",
      "/v2/extract",
      "/v2/extract/:id",
      "/v2/search",
      "/v2/search/:jobId/feedback",
      "/v2/map",
      "/v2/batch/scrape",
      "/v2/batch/scrape/:id",
      "/v2/batch/scrape/:id/errors",
      "/v2/batch/scrape/:id (DELETE)",
      "/v2/crawl",
      "/v2/crawl/:id",
      "/v2/crawl/:id/errors",
      "/v2/crawl/:id (DELETE)",
      "/v2/crawl/ongoing",
      "/v2/crawl/active",
    ],
  }),
);

app.get("/docs", redirectToDocs);
app.get("/docs/*", redirectToDocs);

for (const version of ["v1", "v2"] as const) {
  openapi.post(`/${version}/scrape`, ScrapeEndpoint);
  openapi.get(`/${version}/scrape/:id`, ScrapeStatusEndpoint);
  openapi.post(`/${version}/extract`, ExtractEndpoint);
  openapi.get(`/${version}/extract/:id`, ExtractStatusEndpoint);
  openapi.post(`/${version}/search`, SearchEndpoint);
  openapi.post(`/${version}/map`, MapEndpoint);
  openapi.post(`/${version}/crawl`, CrawlEndpoint);
  openapi.get(`/${version}/crawl/ongoing`, CrawlOngoingEndpoint);
  openapi.get(`/${version}/crawl/active`, CrawlOngoingEndpoint);
  openapi.get(`/${version}/crawl/:id/errors`, CrawlErrorsEndpoint);
  openapi.get(`/${version}/crawl/:id`, CrawlStatusEndpoint);
  openapi.delete(`/${version}/crawl/:id`, CrawlCancelEndpoint);
  openapi.post(`/${version}/batch/scrape`, BatchScrapeEndpoint);
  openapi.get(`/${version}/batch/scrape/:id/errors`, BatchScrapeErrorsEndpoint);
  openapi.get(`/${version}/batch/scrape/:id`, BatchScrapeStatusEndpoint);
  openapi.delete(`/${version}/batch/scrape/:id`, BatchScrapeCancelEndpoint);
}

openapi.post("/v2/search/:jobId/feedback", SearchFeedbackEndpoint);

app.notFound(() => notFound());
app.onError((error, _c) => {
  if (error instanceof HttpError) {
    return json({ success: false, code: error.code, error: error.message }, { status: error.status });
  }
  console.error(error);
  return json(
    {
      success: false,
      code: "UNKNOWN_ERROR",
      error: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
  );
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async queue(batch: MessageBatch<CrawlQueueMessage>, env: Env): Promise<void> {
    await consumeCrawlQueue(batch, env);
  },
};
