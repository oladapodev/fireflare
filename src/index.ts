import { fromHono } from "chanfana";
import { Hono } from "hono";
import { JobStatusObject } from "./durable/job-status";
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
  ScrapeEndpoint,
  ScrapeStatusEndpoint,
  SearchEndpoint,
  SearchFeedbackEndpoint,
  redirectToDocs,
} from "./openapi-routes";
import { consumeCrawlQueue } from "./handlers/crawl";
import { HttpError, json, notFound } from "./utils/http";
import type { CloudflareQueueMessage, Env } from "./types";
import { productRoutes } from "./product/routes";
import { apiAuthAndMetering } from "./product/metering";
import { runDueMonitors } from "./product/monitors";

const app = new Hono<{ Bindings: Env }>();

app.route("/", productRoutes);
app.get("/docs", redirectToDocs);
app.get("/docs/*", redirectToDocs);

for (const path of [
  "/scrape", "/scrape/*",
  "/extract", "/extract/*",
  "/search", "/search/*",
  "/map",
  "/crawl", "/crawl/*",
  "/batch/scrape", "/batch/scrape/*",
]) {
  app.use(path, apiAuthAndMetering);
}

const openapi = fromHono(app, {
  docs_url: null,
  redoc_url: null,
  openapi_url: "/openapi.json",
  openapiVersion: "3.1",
  raiseUnknownParameters: false,
  schema: {
    info: {
      title: "Spindle API",
      version: "0.1.0",
      description: "Cloudflare-native web extraction API. Search web, scrape content, map links, extract structured data, and run crawl jobs.",
    },
    tags: [
      { name: "Scrape", description: "Single-page extraction endpoints" },
      { name: "Extract", description: "Structured extraction jobs" },
      { name: "Search", description: "Search and search feedback endpoints" },
      { name: "Map", description: "Link discovery endpoints" },
      { name: "Crawl", description: "Crawl jobs and crawl status" },
      { name: "Batch", description: "Batch scrape jobs" },
    ],
  },
});

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

app.notFound(notFound);
app.onError((error) => {
  if (error instanceof HttpError) {
    return json({ success: false, code: error.code, error: error.message }, { status: error.status });
  }
  console.error(error);
  return json({ success: false, code: "INTERNAL_ERROR", error: "Internal server error" }, { status: 500 });
});

export { JobStatusObject };

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<CloudflareQueueMessage>, env: Env): Promise<void> {
    await consumeCrawlQueue(batch, env);
  },
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runDueMonitors(env);
  },
};
