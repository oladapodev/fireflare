import { describe, expect, it, vi } from 'vitest';
import {
  FireflareApiError,
  createFireflareAuthHeaders,
  createFireflareClient,
} from '../src';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

describe('Fireflare client', () => {
  it('adds bearer auth for FIREFLARE_API_KEY style credentials', () => {
    expect(createFireflareAuthHeaders('sp_test')).toEqual({ authorization: 'Bearer sp_test' });
  });

  it('posts scrape requests with auth and JSON body', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        success: true,
        data: {
          url: 'https://example.com/',
          markdown: '# Example',
          metadata: {},
        },
      }),
    );
    const client = createFireflareClient({
      baseUrl: 'https://fireflare.example',
      apiKey: 'sp_test',
      fetch: fetcher as unknown as typeof fetch,
    });

    const response = await client.scrape({
      url: 'https://example.com',
      formats: ['markdown'],
      engine: 'fetch',
    });

    expect(response.data?.markdown).toBe('# Example');
    expect(fetcher).toHaveBeenCalledWith(
      'https://fireflare.example/scrape',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer sp_test',
          'content-type': 'application/json',
        }),
        body: JSON.stringify({
          url: 'https://example.com',
          formats: ['markdown'],
          engine: 'fetch',
        }),
      }),
    );
  });

  it('normalizes API errors', async () => {
    const client = createFireflareClient({
      baseUrl: 'https://fireflare.example',
      fetch: (async () =>
        jsonResponse(
          {
            success: false,
            code: 'BAD_REQUEST',
            error: 'url must be a valid http(s) url',
          },
          { status: 400 },
        )) as unknown as typeof fetch,
    });

    await expect(client.scrape({ url: 'not-a-url' })).rejects.toMatchObject({
      name: 'FireflareApiError',
      status: 400,
      code: 'BAD_REQUEST',
      message: 'url must be a valid http(s) url',
    } satisfies Partial<FireflareApiError>);
  });

  it('retries transient failures', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: false, error: 'busy' }, { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { web: [] } }));
    const client = createFireflareClient({
      baseUrl: 'https://fireflare.example',
      fetch: fetcher as unknown as typeof fetch,
      retry: { attempts: 1, baseDelayMs: 1 },
    });

    const response = await client.search({ query: 'slobi', limit: 1 });

    expect(response.success).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('polls batch scrape jobs until terminal status', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, id: 'batch-1', status: 'processing', completed: 0 }))
      .mockResolvedValueOnce(jsonResponse({ success: true, id: 'batch-1', status: 'completed', completed: 1 }));
    const client = createFireflareClient({
      baseUrl: 'https://fireflare.example',
      fetch: fetcher as unknown as typeof fetch,
    });

    const response = await client.waitForBatchScrape('batch-1', { intervalMs: 1, timeoutMs: 50 });

    expect(response.status).toBe('completed');
    expect(fetcher).toHaveBeenCalledWith(
      'https://fireflare.example/batch/scrape/batch-1',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('maps public SDK methods to Fireflare routes', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ success: true, status: 'completed', data: [] }));
    const client = createFireflareClient({
      baseUrl: 'https://fireflare.example/',
      apiKey: 'sp_test',
      fetch: fetcher as unknown as typeof fetch,
      retry: { attempts: 0 },
    });

    await client.getScrape('scrape-1');
    await client.extract({ urls: ['https://example.com'], prompt: 'Summarize.' });
    await client.getExtract('extract-1');
    await client.search({ query: 'slobi', limit: 3 });
    await client.sendSearchFeedback('search-1', {
      rating: 'partial',
      valuableSources: [{ url: 'https://example.com', reason: 'useful' }],
      missingContent: [{ topic: 'pricing' }],
      querySuggestions: 'include official docs',
    });
    await client.map({ url: 'https://example.com', limit: 10 });
    await client.crawl({ url: 'https://example.com', async: true });
    await client.getCrawl('crawl-1');
    await client.cancelCrawl('crawl-1');
    await client.getCrawlErrors('crawl-1');
    await client.listOngoingCrawls();
    await client.listActiveCrawls();
    await client.batchScrape({ urls: ['https://example.com'] });
    await client.getBatchScrape('batch-1');
    await client.cancelBatchScrape('batch-1');
    await client.getBatchScrapeErrors('batch-1');

    const calls = fetcher.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls.map(([url, init]) => `${init.method ?? 'GET'} ${url}`)).toEqual([
      'GET https://fireflare.example/scrape/scrape-1',
      'POST https://fireflare.example/extract',
      'GET https://fireflare.example/extract/extract-1',
      'POST https://fireflare.example/search',
      'POST https://fireflare.example/search/search-1/feedback',
      'POST https://fireflare.example/map',
      'POST https://fireflare.example/crawl',
      'GET https://fireflare.example/crawl/crawl-1',
      'DELETE https://fireflare.example/crawl/crawl-1',
      'GET https://fireflare.example/crawl/crawl-1/errors',
      'GET https://fireflare.example/crawl/ongoing',
      'GET https://fireflare.example/crawl/active',
      'POST https://fireflare.example/batch/scrape',
      'GET https://fireflare.example/batch/scrape/batch-1',
      'DELETE https://fireflare.example/batch/scrape/batch-1',
      'GET https://fireflare.example/batch/scrape/batch-1/errors',
    ]);
  });
});
