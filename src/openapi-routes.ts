import { contentJson, OpenAPIRoute } from "chanfana";
import type { Context } from "hono";
import { z } from "zod";
import {
  handleBatchScrape,
  handleBatchScrapeCancel,
  handleBatchScrapeStatus,
  handleCrawl,
  handleCrawlCancel,
  handleCrawlErrors,
  handleCrawlOngoing,
  handleCrawlStatus,
} from "./handlers/crawl";
import { handleExtract, handleExtractStatus } from "./handlers/extract";
import { handleMap } from "./handlers/map";
import { handleScrape, handleScrapeStatus } from "./handlers/scrape";
import { handleSearch } from "./handlers/search";
import { handleSearchFeedback } from "./handlers/search-feedback";
import type { Env } from "./types";

export type AppContext = Context<{ Bindings: Env }>;

const outputFormat = z.enum(["markdown", "html", "rawHtml", "screenshot", "json", "links"]);
const provider = z.enum(["cloudflare", "kernel", "auto"]);
const idParam = z.object({ id: z.string().describe("Job ID") });
const jobIdParam = z.object({ jobId: z.string().describe("Search job ID") });
const anyJson = z.any();

const scrapeOptionsSchema = z
  .object({
    formats: z.array(outputFormat).optional(),
    onlyMainContent: z.boolean().optional(),
    waitFor: z.number().int().min(0).max(30000).optional(),
    timeout: z.number().int().min(1000).max(300000).optional(),
    browserProvider: provider.optional(),
    jsonPrompt: z.string().optional(),
  })
  .passthrough();

const errorResponse = {
  "400": {
    description: "Invalid request",
    ...contentJson(z.object({ success: z.literal(false).optional(), error: z.string().optional() }).passthrough()),
  },
  "404": {
    description: "Resource not found",
    ...contentJson(z.object({ success: z.literal(false).optional(), error: z.string().optional() }).passthrough()),
  },
};

const successResponse = {
  "200": {
    description: "Successful response",
    ...contentJson(z.object({ success: z.boolean().optional() }).passthrough()),
  },
};

function delegateRequest(c: AppContext, body?: unknown): Request {
  if (body === undefined) return c.req.raw;

  return new Request(c.req.raw.url, {
    method: c.req.raw.method,
    headers: c.req.raw.headers,
    body: JSON.stringify(body),
  });
}

function docsSite(c: AppContext): string {
  return c.env.DOCS_SITE || "https://oladapodev.github.io/fireflare";
}

function routeParam(c: AppContext, name: string): string {
  const value = c.req.param(name);
  if (!value) throw new Error(`Missing route parameter: ${name}`);
  return value;
}

export function redirectToDocs(c: AppContext): Response {
  const target = new URL(docsSite(c));
  const suffix = new URL(c.req.raw.url).pathname.replace(/^\/docs\/?/, "");
  if (suffix) target.pathname = `${target.pathname.replace(/\/$/, "")}/${suffix}`;
  return Response.redirect(target.toString(), 302);
}

export class ScrapeEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Scrape"],
    summary: "Scrape one URL",
    request: {
      body: contentJson(
        z
          .object({
            url: z.string().url(),
            formats: z.array(outputFormat).optional(),
            onlyMainContent: z.boolean().optional(),
            waitFor: z.number().int().min(0).max(30000).optional(),
            timeout: z.number().int().min(1000).max(300000).optional(),
            browserProvider: provider.optional(),
            jsonPrompt: z.string().optional(),
          })
          .passthrough(),
      ),
    },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleScrape(c.req.raw, c.env, c.executionCtx, new URL(c.req.raw.url).pathname);
  }
}

export class ScrapeStatusEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Scrape"],
    summary: "Get scrape status and result",
    request: { params: idParam },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleScrapeStatus(c.req.raw, c.env, routeParam(c, "id"));
  }
}

export class ExtractEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Extract"],
    summary: "Extract structured content from URLs",
    request: {
      body: contentJson(
        z
          .object({
            urls: z.array(z.string()).optional(),
            prompt: z.string().optional(),
            schema: anyJson.optional(),
            includeSubdomains: z.boolean().optional(),
            ignoreInvalidURLs: z.boolean().optional(),
            showSources: z.boolean().optional(),
            waitFor: z.number().int().optional(),
            timeout: z.number().int().optional(),
            formats: z.array(outputFormat).optional(),
            browserProvider: provider.optional(),
            scrapeOptions: scrapeOptionsSchema.optional(),
          })
          .passthrough(),
      ),
    },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleExtract(c.req.raw, c.env, c.executionCtx, new URL(c.req.raw.url).pathname);
  }
}

export class ExtractStatusEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Extract"],
    summary: "Get extract status and result",
    request: { params: idParam },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleExtractStatus(c.env, routeParam(c, "id"));
  }
}

export class SearchEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Search"],
    summary: "Search web results",
    request: {
      body: contentJson(
        z
          .object({
            query: z.string(),
            limit: z.number().int().min(1).max(100).optional(),
            scrapeOptions: scrapeOptionsSchema.optional(),
          })
          .passthrough(),
      ),
    },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleSearch(c.req.raw, c.env, c.executionCtx, new URL(c.req.raw.url).pathname);
  }
}

export class SearchFeedbackEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Search"],
    summary: "Submit feedback for a search result set",
    request: {
      params: jobIdParam,
      body: contentJson(
        z
          .object({
            rating: z.enum(["good", "bad", "partial"]),
            valuableSources: z.array(z.object({ url: z.string(), reason: z.string().optional() })).optional(),
            missingContent: z.array(z.object({ topic: z.string(), description: z.string().optional() })).optional(),
            querySuggestions: z.string().optional(),
          })
          .passthrough(),
      ),
    },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleSearchFeedback(c.req.raw, c.env, routeParam(c, "jobId"));
  }
}

export class MapEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Map"],
    summary: "Discover links on a site",
    request: {
      body: contentJson(
        z
          .object({
            url: z.string().url(),
            limit: z.number().int().min(1).max(100000).optional(),
            includeSubdomains: z.boolean().optional(),
          })
          .passthrough(),
      ),
    },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleMap(c.req.raw, c.env, new URL(c.req.raw.url).pathname);
  }
}

export class CrawlEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Crawl"],
    summary: "Start a crawl job",
    request: {
      body: contentJson(
        z
          .object({
            url: z.string().url(),
            limit: z.number().int().min(1).max(25).optional(),
            maxDepth: z.number().int().min(0).max(3).optional(),
            scrapeOptions: scrapeOptionsSchema.optional(),
            async: z.boolean().optional(),
          })
          .passthrough(),
      ),
    },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleCrawl(c.req.raw, c.env, c.executionCtx);
  }
}

export class CrawlStatusEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Crawl"],
    summary: "Get crawl status and result",
    request: { params: idParam },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleCrawlStatus(c.req.raw, c.env, routeParam(c, "id"));
  }
}

export class CrawlCancelEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Crawl"],
    summary: "Cancel a crawl job",
    request: { params: idParam },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleCrawlCancel(c.env, routeParam(c, "id"));
  }
}

export class CrawlErrorsEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Crawl"],
    summary: "Get crawl job errors",
    request: { params: idParam },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleCrawlErrors(c.env, routeParam(c, "id"));
  }
}

export class CrawlOngoingEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Crawl"],
    summary: "List active crawl and batch jobs",
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleCrawlOngoing(c.env);
  }
}

export class BatchScrapeEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Batch"],
    summary: "Submit URLs for batch scraping",
    request: {
      body: contentJson(
        z
          .object({
            urls: z.array(z.string()),
            webhook: anyJson.optional(),
            ignoreInvalidURLs: z.boolean().optional(),
            appendToId: z.string().optional(),
            maxConcurrency: z.number().int().min(1).max(25).optional(),
            input: anyJson.optional(),
            scrapeOptions: scrapeOptionsSchema.optional(),
          })
          .passthrough(),
      ),
    },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleBatchScrape(c.req.raw, c.env, c.executionCtx);
  }
}

export class BatchScrapeStatusEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Batch"],
    summary: "Get batch scrape status and result",
    request: { params: idParam },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleBatchScrapeStatus(c.env, routeParam(c, "id"));
  }
}

export class BatchScrapeCancelEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Batch"],
    summary: "Cancel a batch scrape job",
    request: { params: idParam },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleBatchScrapeCancel(c.env, routeParam(c, "id"));
  }
}

export class BatchScrapeErrorsEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Batch"],
    summary: "Get batch scrape job errors",
    request: { params: idParam },
    responses: { ...successResponse, ...errorResponse },
  };

  async handle(c: AppContext): Promise<Response> {
    return handleCrawlErrors(c.env, routeParam(c, "id"));
  }
}
