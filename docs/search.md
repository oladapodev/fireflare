---
layout: default
title: Search
parent: API Reference
nav_order: 3
---

<link rel="stylesheet" href="{{ '/assets/css/fireflare-docs.css' | relative_url }}">

# Search

Query web providers and collect ranked results.

## `POST /v1/search` and `POST /v2/search`

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

## `POST /v2/search/{jobId}/feedback`

Submits quality feedback for ranked results.

```bash
curl -X POST \
  https://fireflare-api.oladapo.workers.dev/v2/search/search-uuid/feedback \
  -H "Content-Type: application/json" \
  -d '{"resultIndex": 0, "relevant": true}'
```
