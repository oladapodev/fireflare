---
layout: default
title: Map
parent: API Reference
nav_order: 4
---

<link rel="stylesheet" href="{{ '/assets/css/fireflare-docs.css' | relative_url }}">

# Map

Crawl the link graph within a domain scope and return nodes and edges.

## `POST /map`

Maps links from a start page with optional depth and domain filters.

```json
POST /map
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
