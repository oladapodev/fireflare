# Spindle

Spindle is a Cloudflare Workers API for scraping, extraction, search, mapping, and crawl workflows.

The API contract is generated from Worker route classes with [Chanfana](https://chanfana.pages.dev/introduction) and exposed at:

[OpenAPI schema](https://spindle-api.oladapo.workers.dev/openapi.json)

::: tip Get started
Create an account and generate your first API key from the dashboard:

[Get API key](https://spindle-api.oladapo.workers.dev/request-access)
:::

## Product surface

| Area | Paths |
| --- | --- |
| Scrape | POST /scrape, GET /scrape/{id} |
| Extract | POST /extract, GET /extract/{id} |
| Search | POST /search, `POST /search/{jobId}/feedback` |
| Map | POST /map |
| Crawl | POST /crawl, GET /crawl/{id}, DELETE /crawl/{id} |
| Crawl extras | GET /crawl/{id}/errors, GET /crawl/ongoing, GET /crawl/active |
| Batch scrape | POST /batch/scrape, GET /batch/scrape/{id}, GET /batch/scrape/{id}/errors, DELETE /batch/scrape/{id} |

## Runtime

Spindle runs as `fireflare-api` on Cloudflare Workers with Browser Rendering, D1, R2, Queues, and Durable Objects.

## How docs are organized

- Overview for architecture and endpoint map.
- Getting Started for quick setup.
- API Reference with full endpoint contracts in folded groups.
- Examples for ready-to-run payloads and curl snippets.
- Auth and Errors for behavior notes while auth/rate limits remain planned.

<details markdown="1">
  <summary>Current public deployment</summary>

- API root: <https://spindle-api.oladapo.workers.dev>
- OpenAPI document: <https://spindle-api.oladapo.workers.dev/openapi.json>
- Docs redirect: `<worker>/docs` -> `https://oladapodev.github.io/fireflare`
</details>
