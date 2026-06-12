---
layout: default
title: Crawl
parent: API Reference
nav_order: 5
---

<link rel="stylesheet" href="{{ '/assets/css/fireflare-docs.css' | relative_url }}">

# Crawl

Async breadth-first crawl with status, cancellation, and error reporting.

## `POST /v1/crawl` and `POST /v2/crawl`

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

## `GET /v1/crawl/{id}` and `GET /v2/crawl/{id}`

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

## `DELETE /v1/crawl/{id}` and `DELETE /v2/crawl/{id}`

Cancels a crawl job in progress.

```bash
curl -X DELETE https://fireflare-api.oladapo.workers.dev/v2/crawl/crawl-uuid
```

## `GET /v1/crawl/{id}/errors` and `GET /v2/crawl/{id}/errors`

Returns per-page crawl errors.

```bash
curl https://fireflare-api.oladapo.workers.dev/v2/crawl/crawl-uuid/errors
```

## `GET /v1/crawl/ongoing` and `GET /v2/crawl/ongoing`

Lists crawl jobs currently active by time.

```bash
curl https://fireflare-api.oladapo.workers.dev/v2/crawl/ongoing
```

## `GET /v1/crawl/active` and `GET /v2/crawl/active`

Lists crawl jobs marked active for the deployment.

```bash
curl https://fireflare-api.oladapo.workers.dev/v2/crawl/active
```
