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

<details markdown="1">
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

<details markdown="1">
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

- API-key enforcement is enabled for extraction endpoints.
- Credit metering is tracked for API-key requests.
- Dashboard signup is open through GitHub OAuth; API usage requires generated keys.

Create a key from the account dashboard:

[Get API key](https://spindle-api.oladapo.workers.dev/request-access)

## Recommended production controls

1. Add token auth at ingress (API keys or OAuth2 introspection).
2. Add per-key and per-IP rate limits.
3. Track request id + idempotency headers in analytics/logging.
4. Keep `/openapi.json` behind internal network if you want contract secrecy.
