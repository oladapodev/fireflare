---
layout: default
title: Examples
nav_order: 4
---

<link rel="stylesheet" href="{{ '/assets/css/fireflare-docs.css' | relative_url }}">

# Examples

Each snippet uses the public Worker endpoint.

## Scrape

```bash
curl -X POST https://fireflare-api.oladapo.workers.dev/scrape \
  -H "Content-Type: application/json" \
  -d '{
  "url": "https://example.com",
  "formats": ["markdown"]
  }'
```

```bash
curl https://fireflare-api.oladapo.workers.dev/scrape/af12...
```

## Search

```bash
curl -X POST https://fireflare-api.oladapo.workers.dev/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Cloudflare Workers Browser Rendering",
    "limit": 5
  }'
```

## Map

```bash
curl -X POST https://fireflare-api.oladapo.workers.dev/map \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "limit": 100,
    "includeSubdomains": true
  }'
```

## Async Crawl status loop

```bash
curl -X POST https://fireflare-api.oladapo.workers.dev/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "limit": 5,
    "maxDepth": 1,
    "async": true
  }'
```

```bash
curl https://fireflare-api.oladapo.workers.dev/crawl/af12... | jq
```

## Batch scrape

```bash
curl -X POST https://fireflare-api.oladapo.workers.dev/batch/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com",
      "https://example.com/docs"
    ],
    "formats": ["markdown"],
    "concurrency": 2
  }'
```

```bash
curl https://fireflare-api.oladapo.workers.dev/batch/scrape/af12...
```

## Feedback

```bash
curl -X POST https://fireflare-api.oladapo.workers.dev/search/search-job-id/feedback \
  -H "Content-Type: application/json" \
  -d '{"resultIndex": 0, "relevant": true}'
```

## OpenAPI pull

```bash
curl https://fireflare-api.oladapo.workers.dev/openapi.json | jq '.paths | keys | length'
```
