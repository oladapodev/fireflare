# Spindle Client

Typed TypeScript SDK for the Spindle/Fireflare extraction service.

```ts
import { createFireflareClient } from '@spindle/client';

const spindle = createFireflareClient({
  baseUrl: 'https://spindle-api.oladapo.workers.dev',
  apiKey: process.env.SPINDLE_API_KEY,
});

const page = await spindle.scrape({
  url: 'https://example.com',
  formats: ['markdown', 'links'],
  engine: 'fetch',
});
```

## Covered routes

- `scrape` / `getScrape`
- `extract` / `getExtract` / `waitForExtract`
- `search` / `sendSearchFeedback`
- `map`
- `crawl` / `getCrawl` / `cancelCrawl` / `getCrawlErrors` / `waitForCrawl`
- `listOngoingCrawls` / `listActiveCrawls`
- `batchScrape` / `getBatchScrape` / `cancelBatchScrape` / `getBatchScrapeErrors` / `waitForBatchScrape`

## OpenAPI generation path

The Worker exposes Chanfana OpenAPI at `/openapi.json`. Keep this ergonomic SDK as the stable developer surface while the OpenAPI response schemas are broad passthrough envelopes.

Once `src/openapi-routes.ts` has exact 200 response schemas, generate contract types with:

```sh
openapi-typescript https://spindle-api.oladapo.workers.dev/openapi.json -o src/generated/schema.ts
```

Keep `tests/client.test.ts` as the route coverage guard.
