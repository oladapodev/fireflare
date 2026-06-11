export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface BrowserRunBinding {
  quickAction(action: string, payload: unknown): Promise<unknown>;
}

export interface Env {
  ENVIRONMENT: string;
  BROWSER_PROVIDER: "cloudflare" | "kernel" | "auto";
  SEARCH_PROVIDER: "auto" | "brave" | "searxng" | "browser";
  BROWSER_SEARCH_URL?: string;
  BRAVE_SEARCH_API_KEY?: string;
  SEARXNG_ENDPOINT?: string;
  KERNEL_API_KEY?: string;
  KERNEL_API_BASE?: string;
  DOCS_SITE?: string;
  BROWSER: BrowserRunBinding;
  ARTIFACTS: R2Bucket;
  DB: D1Database;
  CRAWL_QUEUE: Queue<CloudflareQueueMessage>;
  JOB_STATUS: DurableObjectNamespace;
}

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

export type OutputFormat = "markdown" | "html" | "rawHtml" | "screenshot" | "json" | "links";

export interface ScrapeRequest {
  url: string;
  formats?: OutputFormat[];
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  browserProvider?: "cloudflare" | "kernel" | "auto";
  jsonPrompt?: string;
}

export interface ScrapeDocument {
  url: string;
  title?: string;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  screenshot?: string;
  links?: string[];
  json?: JsonValue;
  metadata: Record<string, JsonValue>;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  scrapeOptions?: Omit<ScrapeRequest, "url">;
}

export interface SearchResult {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
  metadata?: Record<string, JsonValue>;
  position?: number;
}

export interface MapRequest {
  url: string;
  limit?: number;
  includeSubdomains?: boolean;
}

export interface ExtractRequest {
  urls: string[];
  prompt?: string;
  schema?: unknown;
  includeSubdomains?: boolean;
  ignoreInvalidURLs?: boolean;
  showSources?: boolean;
  waitFor?: number;
  timeout?: number;
  formats?: OutputFormat[];
  browserProvider?: "cloudflare" | "kernel" | "auto";
  scrapeOptions?: Omit<ScrapeRequest, "url">;
}

export interface BatchScrapeRequest {
  urls: string[];
  webhook?: unknown;
  ignoreInvalidURLs?: boolean;
  appendToId?: string;
  maxConcurrency?: number;
  input?: unknown;
  scrapeOptions?: Omit<ScrapeRequest, "url">;
}

export interface CrawlRequest {
  url: string;
  limit?: number;
  maxDepth?: number;
  scrapeOptions?: Omit<ScrapeRequest, "url">;
  async?: boolean;
}

export interface CrawlQueueMessage {
  id: string;
  request: CrawlRequest;
  type: "crawl";
}

export interface CrawlResult {
  id: string;
  status: "processing" | "completed" | "queued" | "failed" | "cancelled";
  data?: ScrapeDocument[];
  error?: string;
  total?: number;
  completed?: number;
  errors?: Array<{
    id?: string;
    timestamp?: string;
    url: string;
    error: string;
    code?: string;
  }>;
}

export interface BatchScrapeJobRecord {
  id: string;
  total: number;
  completed: number;
  status: "processing" | "completed" | "failed" | "cancelled";
  data: ScrapeDocument[];
  errors?: Array<{
    id?: string;
    timestamp?: string;
    url: string;
    error: string;
    code?: string;
  }>;
}

export interface BatchScrapeQueueMessage {
  id: string;
  request: BatchScrapeRequest;
  type: "batch-scrape";
}

export type CloudflareQueueMessage = CrawlQueueMessage | BatchScrapeQueueMessage;

export interface CrawlError {
  id?: string;
  timestamp?: string;
  url: string;
  error: string;
  code?: string;
}
