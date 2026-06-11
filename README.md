# API Service (Cloudflare Worker)

This repository root contains the standalone Cloudflare deployment for Fireflare.

## Runtime

- Cloudflare Worker entrypoint: `src/index.ts`
- Bindings:
  - `BROWSER` → Cloudflare Browser
  - `DB` → D1 metadata database
  - `ARTIFACTS` → R2 object storage
  - `CRAWL_QUEUE` → Queue
  - `JOB_STATUS` → Durable Object
- Queue consumer: `src/handlers/crawl.ts`
- Migrations: `migrations/0001_initial.sql`

## Endpoints

### Core

- `GET /`
- `POST /v1/scrape`, `POST /v2/scrape`
- `GET /v1/scrape/:id`, `GET /v2/scrape/:id`
- `POST /v1/extract`, `POST /v2/extract`
- `GET /v1/extract/:id`, `GET /v2/extract/:id`
- `POST /v1/search`, `POST /v2/search`
- `POST /v2/search/:id/feedback`

### Mapping

- `POST /v1/map`, `POST /v2/map`

### Crawling and batches

- `POST /v1/crawl`, `POST /v2/crawl`
- `GET /v1/crawl/:id`, `GET /v2/crawl/:id`
- `DELETE /v1/crawl/:id`, `DELETE /v2/crawl/:id`
- `GET /v1/crawl/:id/errors`, `GET /v2/crawl/:id/errors`
- `GET /v1/crawl/ongoing`, `GET /v2/crawl/ongoing`
- `GET /v1/crawl/active`, `GET /v2/crawl/active`
- `POST /v1/batch/scrape`, `POST /v2/batch/scrape`
- `GET /v1/batch/scrape/:id`, `GET /v2/batch/scrape/:id`
- `GET /v1/batch/scrape/:id/errors`, `GET /v2/batch/scrape/:id/errors`
- `DELETE /v1/batch/scrape/:id`, `DELETE /v2/batch/scrape/:id`

## Run and deploy

```bash
# run from repository root
PATH=/home/dev/.nvm/versions/node/v24.16.0/bin:$PATH npm install
PATH=/home/dev/.nvm/versions/node/v24.16.0/bin:$PATH npm run typecheck
PATH=/home/dev/.nvm/versions/node/v24.16.0/bin:$PATH npm run deploy
```

Live worker name: `fireflare-api` (deploy URL shown in wrangler output).

Reference implementation files are preserved in `legacy/` and ignored by git.

## Environment

Required for current functionality:

- `BROWSER_PROVIDER` (default `cloudflare`) or `kernel` to force Kernel
- `KERNEL_API_KEY` for Kernel mode
- `SEARCH_PROVIDER` (default `auto`)
- `KERNEL_API_BASE` default `https://api.onkernel.com`
- `BROWSER_SEARCH_URL` optional search fallback

Secret values are set using Wrangler secret command for this config:

```bash
wrangler secret put KERNEL_API_KEY --config wrangler.jsonc
wrangler secret put BRAVE_SEARCH_API_KEY --config wrangler.jsonc
wrangler secret put AI_GATEWAY_API_TOKEN --config wrangler.jsonc
```

## Docs website

- `GET /docs` — redirects to the GitHub Pages documentation site
- `GET /openapi.json` — Chanfana-generated OpenAPI schema
- `docs/` folder — GitHub Pages documentation source

## Open tasks

- Add auth and rate-limit docs for production.
- Add request/response examples for every route.
