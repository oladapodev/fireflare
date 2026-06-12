---
layout: default
title: Search
parent: API Reference
nav_order: 3
---

<link rel="stylesheet" href="{{ '/assets/css/fireflare-docs.css' | relative_url }}">

# Search

Query web providers and collect ranked results. Optionally scrape result pages into structured formats.

## `POST /search`

Runs web search against configured providers.

```json
POST /search
{
  "query": "cloudflare workers web scraping",
  "limit": 5
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

## `scrapeOptions.formats` — scrape result pages

Pass `scrapeOptions` to scrape each result page and return content in the specified format. Supported formats: `markdown`, `html`, `rawHtml`, `json`, `links`.

```json
POST /search
{
  "query": "cloudflare workers limits",
  "limit": 3,
  "scrapeOptions": {
    "formats": ["markdown"]
  }
}
```

### JSON extraction from result pages

Use `formats: ["json"]` with a `jsonPrompt` to extract structured data from each result page.

```json
POST /search
{
  "query": "typescript best practices 2024",
  "limit": 3,
  "scrapeOptions": {
    "formats": ["json"],
    "jsonPrompt": "Extract the article title, author, and a one-sentence summary."
  }
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
        "title": "TypeScript Best Practices",
        "url": "https://example.com/ts-best-practices",
        "json": {
          "title": "TypeScript Best Practices",
          "author": "Jane Doe",
          "summary": "A guide to writing clean TypeScript in 2024."
        }
      }
    ]
  }
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
