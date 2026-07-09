# Crawl

Async breadth-first crawl with status, cancellation, and error reporting.

## `POST /crawl`

Starts async crawl and returns job id.

```json
POST /crawl
{
  "url": "https://example.com",
  "maxDepth": 2,
  "maxPages": 100,
  "includeSubdomains": false
}
```

## `GET /crawl/{id}`

Fetch crawl status and partial results.

```bash
curl https://spindle-api.oladapo.workers.dev/crawl/crawl-uuid
```

```json
200
{
  "success": true,
  "id": "crawl-uuid",
  "status": "running",
  "visited": 12,
  "remaining": 6
}
```

## `DELETE /crawl/{id}`

Cancels a crawl job in progress.

```bash
curl -X DELETE https://spindle-api.oladapo.workers.dev/crawl/crawl-uuid
```

## `GET /crawl/{id}/errors`

Returns per-page crawl errors.

```bash
curl https://spindle-api.oladapo.workers.dev/crawl/crawl-uuid/errors
```

## `GET /crawl/ongoing`

Lists crawl jobs currently active by time.

```bash
curl https://spindle-api.oladapo.workers.dev/crawl/ongoing
```

## `GET /crawl/active`

Lists crawl jobs marked active for the deployment.

```bash
curl https://spindle-api.oladapo.workers.dev/crawl/active
```
