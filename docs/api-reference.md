---
layout: default
title: API Reference
nav_order: 3
has_children: true
---

<link rel="stylesheet" href="{{ '/assets/css/fireflare-docs.css' | relative_url }}">

# API Reference

Contract generated from Chanfana classes in `src/openapi-routes.ts`. Schema is source-of-truth:

- <https://fireflare-api.oladapo.workers.dev/openapi.json>
- <http://localhost:8787/openapi.json> when running `wrangler dev`

## Base URL and headers

- Base URL: `https://fireflare-api.oladapo.workers.dev`
- Content-Type: `application/json`

```json
{
  "success": true,
  "id": "uuid-or-job-id",
  "data": {},
  "error": null,
  "code": "OK"
}
```

Both `v1` and `v2` route groups are supported for all endpoints. `openapi.json` reflects every registered route.

## Deployment flow

1. `GET /` — service health
2. `POST ...` — launch work, returns job id
3. `GET .../{id}` — status and payload
4. `DELETE .../{id}` — cancel if still running

## Chanfana workflow

- Do not hand-write OpenAPI JSON.
- Update `src/openapi-routes.ts` endpoint classes.
- Keep route behavior in `src/handlers/**`.
- Deploy — schema regenerates at runtime.
