---
layout: default
title: Scrape
parent: API Reference
nav_order: 1
---

<link rel="stylesheet" href="{{ '/assets/css/fireflare-docs.css' | relative_url }}">

# Scrape

Fetch and normalize page content. Returns markdown, raw HTML, or structured text.

## `POST /v1/scrape` and `POST /v2/scrape`

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

## `GET /v1/scrape/{id}` and `GET /v2/scrape/{id}`

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
