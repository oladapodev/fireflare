---
layout: default
title: Auth And Errors
nav_order: 5
---

# Auth And Errors

Production auth and rate limiting are still pending in this repo.

Current error responses use JSON bodies with `success: false`, `error`, and sometimes `code` or `details`.

## Common Status Codes

| Code | Meaning |
| --- | --- |
| `400` | Invalid body, path parameter, or URL |
| `404` | Job or resource not found |
| `409` | Feedback submitted for failed search |
| `500` | Unexpected runtime failure |

## Example Error

```json
{
  "success": false,
  "code": "BAD_REQUEST",
  "error": "url must be a string."
}
```
