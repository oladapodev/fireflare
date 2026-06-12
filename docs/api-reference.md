---
layout: default
title: API Reference
nav_order: 3
---

<link rel="stylesheet" href="{{ '/assets/css/fireflare-docs.css' | relative_url }}">

# API Reference

Fireflare contract is generated from Chanfana classes in `src/openapi-routes.ts`. The schema is source-of-trust at:

- <https://fireflare-api.oladapo.workers.dev/openapi.json>
- <http://localhost:8787/openapi.json> when running `wrangler dev`

Use this page to read API paths and examples by group.

## Base URL and headers

- Base URL: `https://fireflare-api.oladapo.workers.dev`
- Content-Type: `application/json`
- JSON response body pattern:

```json
{
  "success": true,
  "id": "uuid-or-job-id",
  "data": {},
  "error": null,
  "code": "OK"
}
```

- Current release supports both `v1` and `v2` route groups for most endpoints.
- `openapi.json` reflects every route currently registered by the Worker.

## API surfaces (folded)

<details markdown="1">
  <summary><strong>Scrape</strong> — fetch and normalize page content</summary>

### `POST /v1/scrape` and `POST /v2/scrape`

Captures webpage content and returns structured formats.

```json
POST /v2/scrape
{
  "url": "https://example.com",
  "formats": ["markdown", "html", "raw"]
}
```

```json
200
{
  "success": true,
  "id": "job-123e4567-e89b-12d3-a456-426614174000",
  "url": "https://example.com",
  "status": "completed",
  "markdown": "# Example Domain\n...",
  "rawHtml": "<html>...</html>"
}
```

### `GET /v1/scrape/{id}` and `GET /v2/scrape/{id}`

Returns scrape job result by id.

```bash
curl https://fireflare-api.oladapo.workers.dev/v2/scrape/job-123e4567-e89b-12d3-a456-426614174000
```

```json
404
{
  "success": false,
  "error": "Job not found",
  "code": "JOB_NOT_FOUND"
}
```
</details>

<details markdown="1">
  <summary><strong>Extract</strong> — parse and structure extracted content</summary>

### `POST /v1/extract` and `POST /v2/extract`

Extracts content according to schema-driven extraction instructions.

```json
POST /v2/extract
{
  "url": "https://example.com/docs",
  "prompt": "Extract key headings and section links.",
  "formats": ["json", "markdown"]
}
```

```json
200
{
  "success": true,
  "id": "extract-uuid",
  "status": "completed",
  "result": {
    "headings": ["Product", "Quickstart", "FAQ"],
    "links": ["/api", "/pricing"]
  }
}
```

### `GET /v1/extract/{id}` and `GET /v2/extract/{id}`

Fetches extracted payload by job id.

```bash
curl https://fireflare-api.oladapo.workers.dev/v2/extract/extract-uuid
```
</details>

<details markdown="1">
  <summary><strong>Search</strong> — query web providers and collect ranked results</summary>

### `POST /v1/search` and `POST /v2/search`

Runs web search against configured providers.

```json
POST /v2/search
{
  "query": "cloudflare workers web scraping",
  "limit": 3,
  "searchProvider": "brave"
}
```

```json
200
{
  "success": true,
  "id": "search-uuid",
  "status": "completed",
  "results": [
    {
      "title": "Cloudflare Workers Docs",
      "url": "https://developers.cloudflare.com/workers/",
      "snippet": "Edge compute platform..."
    }
  ]
}
```

### `POST /v2/search/{jobId}/feedback`

Submits quality feedback for ranked results.

```bash
curl -X POST \
  https://fireflare-api.oladapo.workers.dev/v2/search/search-uuid/feedback \
  -H "Content-Type: application/json" \
  -d '{"resultIndex": 0, "relevant": true}'
```
</details>

<details markdown="1">
  <summary><strong>Map</strong> — crawl link graph within a domain scope</summary>

### `POST /v1/map` and `POST /v2/map`

Maps links from a start page with optional crawl depth and domain filters.

```json
POST /v2/map
{
  "url": "https://example.com",
  "includeSubdomains": true,
  "limit": 250
}
```

```json
200
{
  "success": true,
  "id": "map-uuid",
  "nodes": 42,
  "edges": [
    {"from": "https://example.com", "to": "https://example.com/docs"}
  ]
}
```
</details>

<details markdown="1">
  <summary><strong>Crawl</strong> — async breadth job execution and status APIs</summary>

### `POST /v1/crawl` and `POST /v2/crawl`

Starts async crawl and returns job id.

```json
POST /v2/crawl
{
  "url": "https://example.com",
  "maxDepth": 2,
  "maxPages": 100,
  "includeSubdomains": false
}
```

### `GET /v1/crawl/{id}` and `GET /v2/crawl/{id}`

Fetch crawl status and partial results.

```bash
curl https://fireflare-api.oladapo.workers.dev/v2/crawl/crawl-uuid
```

```json
200
{
  "success": true,
  "id": "crawl-uuid",
  "status": "running",
  "visited": 12,
  "remaining": 6
}
```

### `DELETE /v1/crawl/{id}` and `DELETE /v2/crawl/{id}`

Cancels a crawl job in progress.

```bash
curl -X DELETE https://fireflare-api.oladapo.workers.dev/v2/crawl/crawl-uuid
```

### `GET /v1/crawl/{id}/errors` and `GET /v2/crawl/{id}/errors`

Returns per-page crawl errors.

```bash
curl https://fireflare-api.oladapo.workers.dev/v2/crawl/crawl-uuid/errors
```

### `GET /v1/crawl/ongoing`, `GET /v2/crawl/ongoing`

Lists crawl jobs currently active by time.

```bash
curl https://fireflare-api.oladapo.workers.dev/v2/crawl/ongoing
```

### `GET /v1/crawl/active`, `GET /v2/crawl/active`

Lists crawl jobs marked active for the deployment.

```bash
curl https://fireflare-api.oladapo.workers.dev/v2/crawl/active
```
</details>

<details markdown="1">
  <summary><strong>Batch scrape</strong> — queue multi-URL scrape jobs</summary>

### `POST /v1/batch/scrape` and `POST /v2/batch/scrape`

Starts a batch job for many URLs.

```json
POST /v2/batch/scrape
{
  "urls": [
    "https://example.com",
    "https://example.com/docs"
  ],
  "formats": ["markdown"],
  "concurrency": 3
}
```

```json
202
{
  "success": true,
  "id": "batch-uuid",
  "status": "queued",
  "count": 2
}
```

### `GET /v1/batch/scrape/{id}` and `GET /v2/batch/scrape/{id}`

Fetch batch progress and completed/failed counters.

```bash
curl https://fireflare-api.oladapo.workers.dev/v2/batch/scrape/batch-uuid
```

### `GET /v1/batch/scrape/{id}/errors` and `GET /v2/batch/scrape/{id}/errors`

Returns per-item errors from async batch workers.

```bash
curl https://fireflare-api.oladapo.workers.dev/v2/batch/scrape/batch-uuid/errors
```

### `DELETE /v1/batch/scrape/{id}` and `DELETE /v2/batch/scrape/{id}`

Cancels remaining tasks for a batch id.

```bash
curl -X DELETE https://fireflare-api.oladapo.workers.dev/v2/batch/scrape/batch-uuid
```
</details>

## Quick endpoint map

- v1 and v2 share same payload model and response shape.
- `openapi.json` includes all paths above and their schemas.
- Crawl/Batch operations include async status and cancellation semantics.

## Deployment flow

1. `GET /` for service health.
2. `POST ...` to launch work.
3. `GET .../{id}` for status and payload.
4. `DELETE .../{id}` to cancel if still running.

## Chanfana workflow

- Do not hand-write OpenAPI JSON.
- Update `src/openapi-routes.ts` endpoint classes.
- Keep route behavior in `src/handlers/**`.
- Deploy and let schema regenerate at runtime.

