---
layout: default
title: API Reference
nav_order: 3
---

# API Reference

Fireflare generates its OpenAPI document from Chanfana route classes in the Worker.

Source of truth:

[https://fireflare-api.oladapo.workers.dev/openapi.json](https://fireflare-api.oladapo.workers.dev/openapi.json)

## Local Schema

When running `wrangler dev`, use:

```bash
curl http://localhost:8787/openapi.json
```

## Documentation Flow

Do not hand-write OpenAPI JSON. Add or update Chanfana endpoint classes in `src/openapi-routes.ts`, then let Chanfana regenerate `/openapi.json`.

Docs pages here should explain usage, examples, auth, and concepts. Endpoint contracts live in generated OpenAPI.
