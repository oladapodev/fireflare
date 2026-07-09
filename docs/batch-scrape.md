# Batch Scrape

Queue multi-URL scrape jobs with concurrency control, progress tracking, and cancellation.

## `POST /batch/scrape`

Starts a batch job for many URLs.

```json
POST /batch/scrape
{
  "urls": [
    "https://example.com",
    "https://example.com/docs"
  ],
  "formats": ["markdown"],
  "concurrency": 3
}
```

```json
202
{
  "success": true,
  "id": "batch-uuid",
  "status": "queued",
  "count": 2
}
```

## `GET /batch/scrape/{id}`

Fetch batch progress and completed/failed counters.

```bash
curl https://spindle-api.oladapo.workers.dev/batch/scrape/batch-uuid
```

## `GET /batch/scrape/{id}/errors`

Returns per-item errors from async batch workers.

```bash
curl https://spindle-api.oladapo.workers.dev/batch/scrape/batch-uuid/errors
```

## `DELETE /batch/scrape/{id}`

Cancels remaining tasks for a batch id.

```bash
curl -X DELETE https://spindle-api.oladapo.workers.dev/batch/scrape/batch-uuid
```
