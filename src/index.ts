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
      "/scrape",
      "/scrape/:id",
      "/extract",
      "/extract/:id",
      "/search",
      "/search/:jobId/feedback",
      "/map",
      "/batch/scrape",
      "/batch/scrape/:id",
      "/batch/scrape/:id/errors",
      "/batch/scrape/:id (DELETE)",
      "/crawl",
      "/crawl/:id",
      "/crawl/:id/errors",
      "/crawl/:id (DELETE)",
      "/crawl/ongoing",
      "/crawl/active",
    ],
  }),
);

app.get("/docs", redirectToDocs);
app.get("/docs/*", redirectToDocs);

openapi.post("/scrape", ScrapeEndpoint);
openapi.get("/scrape/:id", ScrapeStatusEndpoint);
openapi.post("/extract", ExtractEndpoint);
openapi.get("/extract/:id", ExtractStatusEndpoint);
openapi.post("/search", SearchEndpoint);
openapi.post("/search/:jobId/feedback", SearchFeedbackEndpoint);
openapi.post("/map", MapEndpoint);
openapi.post("/crawl", CrawlEndpoint);
openapi.get("/crawl/ongoing", CrawlOngoingEndpoint);
openapi.get("/crawl/active", CrawlOngoingEndpoint);
openapi.get("/crawl/:id/errors", CrawlErrorsEndpoint);
openapi.get("/crawl/:id", CrawlStatusEndpoint);
openapi.delete("/crawl/:id", CrawlCancelEndpoint);
openapi.post("/batch/scrape", BatchScrapeEndpoint);
openapi.get("/batch/scrape/:id/errors", BatchScrapeErrorsEndpoint);
openapi.get("/batch/scrape/:id", BatchScrapeStatusEndpoint);
openapi.delete("/batch/scrape/:id", BatchScrapeCancelEndpoint);

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
