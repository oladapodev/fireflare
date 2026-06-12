---
layout: default
title: Search
parent: API Reference
nav_order: 3
---

<link rel="stylesheet" href="{{ '/assets/css/fireflare-docs.css' | relative_url }}">

# Search

Query web providers and collect ranked results.

## `POST /search`

Runs web search against configured providers.

```json
POST /search
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
  "data": {
    "web": [
      {
        "title": "Cloudflare Workers Docs",
        "url": "https://developers.cloudflare.com/workers/",
        "snippet": "Edge compute platform..."
      }
    ]
  },
  "creditsUsed": 2,
  "error": null
}
```

## `POST /search/{jobId}/feedback`

Submits quality feedback for ranked results.

```bash
curl -X POST \
  https://fireflare-api.oladapo.workers.dev/search/search-uuid/feedback \
  -H "Content-Type: application/json" \
  -d '{"resultIndex": 0, "relevant": true}'
```
