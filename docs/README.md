# Fireflare Documentation

Fireflare is a Cloudflare Workers API for web extraction, mapping, and crawling.

## What this project is

- Standalone API service at `src/index.ts`.
- Queue-backed crawl processing with Durable Object status tracking.
- Browser integration via Cloudflare Browser and Kernel provider options.
- Search integration via Brave/Searxng and browser fallback.

## API routes

- `GET /` — health/status payload.
- `POST /v1/scrape`, `POST /v2/scrape`
- `GET /v1/scrape/:id`, `GET /v2/scrape/:id`
- `POST /v1/extract`, `POST /v2/extract`
- `GET /v1/extract/:id`, `GET /v2/extract/:id`
- `POST /v1/search`, `POST /v2/search`
- `POST /v2/search/:id/feedback`
- `POST /v1/map`, `POST /v2/map`
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

## Local docs website

This repository ships public documentation through GitHub Pages:

- `/docs` on the Worker redirects to the Pages docs site.
- `/openapi.json` on the Worker serves the Chanfana-generated OpenAPI schema.
- `docs/` contains markdown pages for GitHub Pages.

## Repo docs map

- `README.md` — runtime and quickstart
- `docus/` — legacy planning notes (ignored in git)
- `docs/` — now used for maintainable public documentation
- `docs/assets/css/fireflare-docs.css` — Cloudflare orange light/dark visual system

## Docs notes

- API docs now present full endpoint coverage using folded sections in [api-reference.md](/home/dev/Desktop/fireflare/docs/api-reference.md).
- Code blocks share a tuned syntax palette for both light and dark mode.
- `/docs` on the worker redirects to GitHub Pages.

## Runtime setup

See `.github` docs removed from this trimmed repo copy. Keep required env vars in deployment:

- `BROWSER_PROVIDER`
- `SEARCH_PROVIDER`
- `KERNEL_API_KEY`
- `KERNEL_API_BASE`
- `BROWSER_SEARCH_URL`
- `BRAVE_SEARCH_API_KEY`
- `AI_GATEWAY_API_TOKEN` (when needed)

Run:

```bash
PATH=/home/dev/.bun/bin:$PATH bun install
PATH=/home/dev/.bun/bin:$PATH bun run typecheck
PATH=/home/dev/.bun/bin:$PATH bun run deploy
```
