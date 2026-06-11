---
layout: default
title: Examples
nav_order: 4
---

# Examples

## Scrape

```bash
curl -X POST https://fireflare-api.oladapo.workers.dev/v2/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "formats": ["markdown"]
  }'
```

## Search

```bash
curl -X POST https://fireflare-api.oladapo.workers.dev/v2/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Cloudflare Workers Browser Rendering",
    "limit": 5
  }'
```

## Map

```bash
curl -X POST https://fireflare-api.oladapo.workers.dev/v2/map \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "limit": 100,
    "includeSubdomains": true
  }'
```

## Async Crawl

```bash
curl -X POST https://fireflare-api.oladapo.workers.dev/v2/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "limit": 5,
    "maxDepth": 1,
    "async": true
  }'
```
