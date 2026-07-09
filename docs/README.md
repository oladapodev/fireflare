# Spindle Documentation

Spindle is a Cloudflare Workers API for web extraction, mapping, and crawling.

## What this project is

- Standalone API service at `src/index.ts`.
- Queue-backed crawl processing with Durable Object status tracking.
- Browser integration via Cloudflare Browser and Kernel provider options.
- Search integration via Brave/Searxng and browser fallback.

## API routes

- `GET /` — health/status payload.
- POST /scrape
- GET /scrape/:id
- POST /extract
- GET /extract/:id
- POST /search
- `POST /search/:id/feedback`
- POST /map
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

## Local docs website

This repository ships public documentation through GitHub Pages:

- `/docs` on the Worker redirects to the Pages docs site.
- `/openapi.json` on the Worker serves the Chanfana-generated OpenAPI schema.
- `docs/` contains markdown pages for GitHub Pages.

## Repo docs map

- `README.md` — runtime and quickstart
- `docus/` — legacy planning notes (ignored in git)
- `docs/` — VitePress public documentation
- `docs/.vitepress/` — VitePress config, navigation, and theme styles

## Docs notes

- API docs now present full endpoint coverage using folded sections in [api-reference.md](./api-reference.md).
- Code blocks share a tuned syntax palette for both light and dark mode.
- `/docs` on the worker redirects to the VitePress site on GitHub Pages.

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
