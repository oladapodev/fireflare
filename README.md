# API Service (Cloudflare Worker)

This repository root contains the standalone Cloudflare deployment for Spindle.

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
- POST /scrape
- GET /scrape/:id
- POST /extract
- GET /extract/:id
- POST /search
- `POST /search/:id/feedback`

### Mapping

- POST /map

### Crawling and batches

- POST /crawl
- GET /crawl/:id
- DELETE /crawl/:id
- GET /crawl/:id/errors
- GET /crawl/ongoing
- GET /crawl/active
- POST /batch/scrape
- GET /batch/scrape/:id
- GET /batch/scrape/:id/errors
- DELETE /batch/scrape/:id

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
- `docs/` folder — VitePress documentation source

```bash
PATH=/home/dev/.bun/bin:$PATH bun install
PATH=/home/dev/.bun/bin:$PATH bun run docs:dev
PATH=/home/dev/.bun/bin:$PATH bun run docs:build
```

The docs nav includes a **Get API Key** entry that sends users to the account signup/dashboard flow.

## CI

GitHub Actions runs:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run docs:build
```
