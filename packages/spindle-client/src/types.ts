export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type FireflareOutputFormat = 'markdown' | 'html' | 'rawHtml' | 'screenshot' | 'json' | 'links';
export type FireflareBrowserProvider = 'cloudflare' | 'kernel' | 'auto';
export type FireflareScrapeEngine = 'browser' | 'fetch';
export type FireflareJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type FireflareScrapeOptions = {
  formats?: FireflareOutputFormat[];
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  browserProvider?: FireflareBrowserProvider;
  jsonPrompt?: string;
  maxAge?: number;
  engine?: FireflareScrapeEngine;
};

export type FireflareScrapeRequest = FireflareScrapeOptions & {
  url: string;
};

export type FireflareDocument = {
  url: string;
  title?: string;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  screenshot?: string;
  links?: string[];
  json?: JsonValue;
  metadata: Record<string, JsonValue>;
};

export type FireflareScrapeResponse = {
  success: boolean;
  id?: string;
  status?: FireflareJobStatus;
  data?: FireflareDocument;
  error?: string;
  code?: string;
};

export type FireflareExtractRequest = {
  urls: string[];
  prompt?: string;
  schema?: unknown;
  includeSubdomains?: boolean;
  ignoreInvalidURLs?: boolean;
  showSources?: boolean;
  waitFor?: number;
  timeout?: number;
  formats?: FireflareOutputFormat[];
  browserProvider?: FireflareBrowserProvider;
  scrapeOptions?: FireflareScrapeOptions;
};

export type FireflareExtractResponse = {
  success: boolean;
  id?: string;
  status?: FireflareJobStatus;
  data?: unknown[];
  invalidURLs?: string[];
  urlTrace?: string[];
  total?: number;
  completed?: number;
  warnings?: string[];
  replacement?: string;
  expiresAt?: string;
  creditsUsed?: number;
  tokensUsed?: number;
  error?: string;
  code?: string;
};

export type FireflareSearchRequest = {
  query: string;
  limit?: number;
  scrapeOptions?: FireflareScrapeOptions;
};

export type FireflareSearchResult = {
  url: string;
  title?: string;
  description?: string;
  snippet?: string;
  markdown?: string;
  json?: JsonValue;
  metadata?: Record<string, JsonValue>;
  position?: number;
};

export type FireflareSearchResponse = {
  success: boolean;
  id?: string;
  status?: FireflareJobStatus;
  data?: {
    web: FireflareSearchResult[];
  };
  creditsUsed?: number;
  error?: string | null;
  code?: string;
};

export type FireflareSearchFeedbackRequest = {
  rating: 'good' | 'bad' | 'partial';
  valuableSources?: Array<{
    url: string;
    reason?: string;
  }>;
  missingContent?: Array<{
    topic: string;
    description?: string;
  }>;
  querySuggestions?: string;
};

export type FireflareSearchFeedbackResponse = {
  success: boolean;
  feedbackId?: string;
  creditsRefunded?: number;
  creditsRefundedToday?: number;
  dailyRefundCap?: number;
  alreadySubmitted?: boolean;
  dailyCapReached?: boolean;
  error?: string;
  code?: string;
  feedbackErrorCode?: string;
  details?: unknown;
};

export type FireflareMapRequest = {
  url: string;
  limit?: number;
  includeSubdomains?: boolean;
};

export type FireflareMapLink = {
  url: string;
  title?: string;
};

export type FireflareMapResponse = {
  success: boolean;
  links?: FireflareMapLink[];
  nodes?: number;
  edges?: Array<{ from: string; to: string }>;
  error?: string;
  code?: string;
};

export type FireflareCrawlRequest = {
  url: string;
  limit?: number;
  maxDepth?: number;
  scrapeOptions?: FireflareScrapeOptions;
  async?: boolean;
  concurrency?: number;
};

export type FireflareCrawlError = {
  id?: string;
  timestamp?: string;
  url: string;
  error: string;
  code?: string;
};

export type FireflareCrawlResponse = {
  success?: boolean;
  id?: string;
  status: FireflareJobStatus;
  url?: string;
  data?: FireflareDocument[];
  error?: string;
  code?: string;
  total?: number;
  completed?: number;
  errors?: FireflareCrawlError[];
};

export type FireflareCrawlListItem = {
  id: string;
  status: FireflareJobStatus;
  created_at?: string;
  url?: string;
  kind?: string;
};

export type FireflareCrawlListResponse = {
  success?: boolean;
  data?: FireflareCrawlListItem[];
  crawls?: FireflareCrawlListItem[];
};

export type FireflareBatchScrapeRequest = {
  urls: string[];
  webhook?: unknown;
  ignoreInvalidURLs?: boolean;
  appendToId?: string;
  maxConcurrency?: number;
  input?: unknown;
  scrapeOptions?: FireflareScrapeOptions;
};

export type FireflareBatchScrapeResponse = {
  success: boolean;
  id?: string;
  status: FireflareJobStatus;
  total?: number;
  completed?: number;
  data?: FireflareDocument[] | { invalidURLs?: string[] };
  errors?: FireflareCrawlError[];
  error?: string;
  code?: string;
};

export type FireflareJobErrorsResponse = {
  errors: FireflareCrawlError[];
  robotsBlocked?: string[];
};

export type FireflareRetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryStatuses?: number[];
};

export type FireflareClientOptions = {
  baseUrl: string;
  apiKey?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  retry?: FireflareRetryOptions;
  defaultHeaders?: Record<string, string>;
};

export type FireflarePollOptions = {
  intervalMs?: number;
  timeoutMs?: number;
};
