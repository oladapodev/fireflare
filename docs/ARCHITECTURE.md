# Architecture

## Request path

`src/index.ts` routes all requests.

- Root JSON response on `GET /`.
- Route handlers for scrape/extract/search/map/crawl/batch.
- Queue consumer dispatch in `consumeCrawlQueue`.

## Components

- **Worker runtime**: Cloudflare Worker entrypoint in `src/index.ts`.
- **Compute**: `src/handlers/*` for request logic and queue jobs.
- **Storage**: D1 database for job metadata and state.
- **Artifacts**: R2 bucket for stored payloads/results.
- **Queue**: Cloudflare Queue for crawl and batch jobs.
- **Durable Object**: `JobStatusObject` for mutable job status in `src/durable/job-status.ts`.

## Search provider abstraction

`src/search/*` chooses provider based on `SEARCH_PROVIDER`:

- `brave`
- `searxng`
- `browser`
- `auto`

Each provider normalizes results to shared response shape.

## Browser provider abstraction

`src/browser/*` routes through:

- Cloudflare Browser (`env.BROWSER`)
- Kernel provider (`src/browser/kernel.ts`) when `BROWSER_PROVIDER=kernel`

Provider selection is validated per endpoint and request.

## Observability and failures

- Runtime errors map to structured `HttpError` with stable codes.
- Crawl/batch failures captured with error arrays and surfaced via `errors` endpoints.
- Queue batch failures are retried by queue policy before moving to DLQ.
