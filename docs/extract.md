---
layout: default
title: Extract
parent: API Reference
nav_order: 2
---

<link rel="stylesheet" href="{{ '/assets/css/fireflare-docs.css' | relative_url }}">

# Extract

Parse and structure page content using schema-driven extraction instructions.

## `POST /v1/extract` and `POST /v2/extract`

Extracts content according to a prompt and optional output schema.

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

## `GET /v1/extract/{id}` and `GET /v2/extract/{id}`

Fetches extracted payload by job id.

```bash
curl https://fireflare-api.oladapo.workers.dev/v2/extract/extract-uuid
```
