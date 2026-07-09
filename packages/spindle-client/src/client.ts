import {
  FireflareApiError,
  FireflarePollTimeoutError,
  FireflareTimeoutError,
  normalizeFireflareError,
} from './errors';
import type {
  FireflareBatchScrapeRequest,
  FireflareBatchScrapeResponse,
  FireflareClientOptions,
  FireflareCrawlListResponse,
  FireflareCrawlRequest,
  FireflareCrawlResponse,
  FireflareExtractRequest,
  FireflareExtractResponse,
  FireflareJobErrorsResponse,
  FireflareJobStatus,
  FireflareMapRequest,
  FireflareMapResponse,
  FireflarePollOptions,
  FireflareRetryOptions,
  FireflareScrapeRequest,
  FireflareScrapeResponse,
  FireflareSearchFeedbackRequest,
  FireflareSearchFeedbackResponse,
  FireflareSearchRequest,
  FireflareSearchResponse,
} from './types';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_RETRY_STATUSES = [408, 429, 500, 502, 503, 504];
const TERMINAL_STATUSES = new Set<FireflareJobStatus>(['completed', 'failed', 'cancelled']);

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
};

export function createFireflareAuthHeaders(apiKey?: string): Record<string, string> {
  if (!apiKey) return {};
  return { authorization: `Bearer ${apiKey}` };
}

export class FireflareClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly retry: Required<FireflareRetryOptions>;
  private readonly headers: Record<string, string>;

  constructor(options: FireflareClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetcher = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retry = {
      attempts: options.retry?.attempts ?? 2,
      baseDelayMs: options.retry?.baseDelayMs ?? 250,
      maxDelayMs: options.retry?.maxDelayMs ?? 2_000,
      retryStatuses: options.retry?.retryStatuses ?? DEFAULT_RETRY_STATUSES,
    };
    this.headers = {
      ...createFireflareAuthHeaders(options.apiKey),
      ...(options.defaultHeaders ?? {}),
    };
  }

  scrape(input: FireflareScrapeRequest): Promise<FireflareScrapeResponse> {
    return this.request('/scrape', { method: 'POST', body: input });
  }

  getScrape(id: string): Promise<FireflareScrapeResponse> {
    return this.request(`/scrape/${encodeURIComponent(id)}`);
  }

  extract(input: FireflareExtractRequest): Promise<FireflareExtractResponse> {
    return this.request('/extract', { method: 'POST', body: input });
  }

  getExtract(id: string): Promise<FireflareExtractResponse> {
    return this.request(`/extract/${encodeURIComponent(id)}`);
  }

  search(input: FireflareSearchRequest): Promise<FireflareSearchResponse> {
    return this.request('/search', { method: 'POST', body: input });
  }

  sendSearchFeedback(jobId: string, input: FireflareSearchFeedbackRequest): Promise<FireflareSearchFeedbackResponse> {
    return this.request(`/search/${encodeURIComponent(jobId)}/feedback`, { method: 'POST', body: input });
  }

  map(input: FireflareMapRequest): Promise<FireflareMapResponse> {
    return this.request('/map', { method: 'POST', body: input });
  }

  crawl(input: FireflareCrawlRequest): Promise<FireflareCrawlResponse> {
    return this.request('/crawl', { method: 'POST', body: input });
  }

  getCrawl(id: string): Promise<FireflareCrawlResponse> {
    return this.request(`/crawl/${encodeURIComponent(id)}`);
  }

  cancelCrawl(id: string): Promise<FireflareCrawlResponse> {
    return this.request(`/crawl/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  getCrawlErrors(id: string): Promise<FireflareJobErrorsResponse> {
    return this.request(`/crawl/${encodeURIComponent(id)}/errors`);
  }

  listOngoingCrawls(): Promise<FireflareCrawlListResponse> {
    return this.request('/crawl/ongoing');
  }

  listActiveCrawls(): Promise<FireflareCrawlListResponse> {
    return this.request('/crawl/active');
  }

  batchScrape(input: FireflareBatchScrapeRequest): Promise<FireflareBatchScrapeResponse> {
    return this.request('/batch/scrape', { method: 'POST', body: input });
  }

  getBatchScrape(id: string): Promise<FireflareBatchScrapeResponse> {
    return this.request(`/batch/scrape/${encodeURIComponent(id)}`);
  }

  cancelBatchScrape(id: string): Promise<FireflareBatchScrapeResponse> {
    return this.request(`/batch/scrape/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  getBatchScrapeErrors(id: string): Promise<FireflareJobErrorsResponse> {
    return this.request(`/batch/scrape/${encodeURIComponent(id)}/errors`);
  }

  waitForExtract(id: string, options: FireflarePollOptions = {}): Promise<FireflareExtractResponse> {
    return this.poll(() => this.getExtract(id), options);
  }

  waitForCrawl(id: string, options: FireflarePollOptions = {}): Promise<FireflareCrawlResponse> {
    return this.poll(() => this.getCrawl(id), options);
  }

  waitForBatchScrape(id: string, options: FireflarePollOptions = {}): Promise<FireflareBatchScrapeResponse> {
    return this.poll(() => this.getBatchScrape(id), options);
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    const headers = {
      ...this.headers,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    };

    for (let attempt = 0; attempt <= this.retry.attempts; attempt++) {
      try {
        const requestInit: RequestInit = {
          method,
          headers,
        };
        if (body !== undefined) {
          requestInit.body = body;
        }

        const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, requestInit);
        const payload = await readResponseBody(response);

        if (response.ok) {
          return payload as T;
        }

        if (attempt < this.retry.attempts && this.retry.retryStatuses.includes(response.status)) {
          await delay(backoffMs(attempt, this.retry.baseDelayMs, this.retry.maxDelayMs));
          continue;
        }

        throw normalizeFireflareError(response.status, payload);
      } catch (error) {
        if (error instanceof FireflareApiError) throw error;
        if (error instanceof FireflareTimeoutError) throw error;
        if (attempt >= this.retry.attempts) throw error;
        await delay(backoffMs(attempt, this.retry.baseDelayMs, this.retry.maxDelayMs));
      }
    }

    throw new FireflareApiError('Fireflare request failed after retries', 0, null);
  }

  private async fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await this.fetcher(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (isAbortError(error)) {
        throw new FireflareTimeoutError(`Fireflare request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async poll<T extends { status?: FireflareJobStatus }>(
    load: () => Promise<T>,
    options: FireflarePollOptions,
  ): Promise<T> {
    const intervalMs = options.intervalMs ?? 1_500;
    const timeoutMs = options.timeoutMs ?? 120_000;
    const startedAt = Date.now();

    while (Date.now() - startedAt <= timeoutMs) {
      const payload = await load();
      if (payload.status && TERMINAL_STATUSES.has(payload.status)) {
        return payload;
      }
      await delay(intervalMs);
    }

    throw new FireflarePollTimeoutError(`Fireflare job did not finish within ${timeoutMs}ms`);
  }
}

export function createFireflareClient(options: FireflareClientOptions): FireflareClient {
  return new FireflareClient(options);
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function backoffMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  return Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
