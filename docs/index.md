---
layout: default
title: Overview
nav_order: 1
---

<link rel="stylesheet" href="{{ '/assets/css/fireflare-docs.css' | relative_url }}">

# Fireflare

Fireflare is a Cloudflare Workers API for scraping, extraction, search, mapping, and crawl workflows.

The API contract is generated from Worker route classes with [Chanfana](https://chanfana.pages.dev/introduction) and exposed at:

[OpenAPI schema](https://fireflare-api.oladapo.workers.dev/openapi.json)

## Product surface

| Area | Paths |
| --- | --- |
| Scrape | `POST /v1/scrape`, `POST /v2/scrape`, `GET /v1/scrape/{id}`, `GET /v2/scrape/{id}` |
| Extract | `POST /v1/extract`, `POST /v2/extract`, `GET /v1/extract/{id}`, `GET /v2/extract/{id}` |
| Search | `POST /v1/search`, `POST /v2/search`, `POST /v2/search/{jobId}/feedback` |
| Map | `POST /v1/map`, `POST /v2/map` |
| Crawl | `POST /v1/crawl`, `POST /v2/crawl`, `GET /v1/crawl/{id}`, `GET /v2/crawl/{id}`, `DELETE /v1/crawl/{id}`, `DELETE /v2/crawl/{id}` |
| Crawl extras | `GET /v1/crawl/{id}/errors`, `GET /v2/crawl/{id}/errors`, `GET /v1/crawl/ongoing`, `GET /v2/crawl/ongoing`, `GET /v1/crawl/active`, `GET /v2/crawl/active` |
| Batch scrape | `POST /v1/batch/scrape`, `POST /v2/batch/scrape`, `GET /v1/batch/scrape/{id}`, `GET /v2/batch/scrape/{id}`, `GET /v1/batch/scrape/{id}/errors`, `GET /v2/batch/scrape/{id}/errors`, `DELETE /v1/batch/scrape/{id}`, `DELETE /v2/batch/scrape/{id}` |

## Runtime

Fireflare runs as `fireflare-api` on Cloudflare Workers with Browser Rendering, D1, R2, Queues, and Durable Objects.

## How docs are organized

- Overview for architecture and endpoint map.
- Getting Started for quick setup.
- API Reference with full endpoint contracts in folded groups.
- Examples for ready-to-run payloads and curl snippets.
- Auth and Errors for behavior notes while auth/rate limits remain planned.

<details>
  <summary>Current public deployment</summary>

- API root: <https://fireflare-api.oladapo.workers.dev>
- OpenAPI document: <https://fireflare-api.oladapo.workers.dev/openapi.json>
- Docs redirect: `<worker>/docs` -> `https://oladapodev.github.io/fireflare`
</details>
