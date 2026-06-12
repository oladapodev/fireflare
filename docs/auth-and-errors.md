---
layout: default
title: Auth And Errors
nav_order: 5
---

<link rel="stylesheet" href="{{ '/assets/css/fireflare-docs.css' | relative_url }}">

# Auth And Errors

Production auth and rate limiting are still pending in this repo.
The response envelope and error behavior shown below reflect worker runtime today.

Current error responses use JSON with:

- `success` (boolean)
- `error` (string)
- optional `code` (machine-readable)
- optional `details`
- optional `field` for validation issues
- optional `status` for async tasks

## Common Status Codes

| Code | Meaning |
| --- | --- |
| `400` | Invalid body, path parameter, or URL |
| `404` | Job or resource not found |
| `409` | Feedback submitted for failed search |
| `500` | Unexpected runtime failure |
| `503` | Provider or dependency temporary failure |

<details>
  <summary>Error sample: invalid URL</summary>

```json
{
  "success": false,
  "code": "BAD_REQUEST",
  "error": "url must be a valid http(s) url",
  "details": { "field": "url" }
}
```
</details>

<details>
  <summary>Error sample: missing job</summary>

```json
{
  "success": false,
  "code": "RESOURCE_NOT_FOUND",
  "error": "Job does not exist",
  "details": { "id": "crawl-unknown" }
}
```
</details>

## Error-handling expectations

- Inputs are validated before queueing work.
- Async handlers can return `queued`, `running`, `completed`, or `failed`.
- For `failed`, clients should retry with fresh `POST` for idempotent operations if safe.

## Auth and rate limiting status

Current status:

- No API-key enforcement yet.
- No strict request quotas yet.
- If you need temporary access gating, add it at your edge or gateway layer before exposing public endpoints.

## Recommended production controls

1. Add token auth at ingress (API keys or OAuth2 introspection).
2. Add per-key and per-IP rate limits.
3. Track request id + idempotency headers in analytics/logging.
4. Keep `/openapi.json` behind internal network if you want contract secrecy.
