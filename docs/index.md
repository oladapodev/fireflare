---
layout: default
title: Overview
nav_order: 1
---

# Fireflare

Fireflare is a Cloudflare Workers API for scraping pages, extracting structured content, searching the web, mapping links, and running crawl jobs.

The API contract is generated from the Worker route code with Chanfana. Use the live OpenAPI document as the source of truth:

[OpenAPI schema](https://fireflare-api.oladapo.workers.dev/openapi.json)

## Core surfaces

| Area | Routes |
| --- | --- |
| Scrape | `POST /v1/scrape`, `POST /v2/scrape`, `GET /v1/scrape/{id}` |
| Extract | `POST /v1/extract`, `POST /v2/extract`, `GET /v1/extract/{id}` |
| Search | `POST /v1/search`, `POST /v2/search`, `POST /v2/search/{jobId}/feedback` |
| Map | `POST /v1/map`, `POST /v2/map` |
| Crawl | `POST /v1/crawl`, `GET /v1/crawl/{id}`, `DELETE /v1/crawl/{id}` |
| Batch | `POST /v1/batch/scrape`, `GET /v1/batch/scrape/{id}`, `DELETE /v1/batch/scrape/{id}` |

## Runtime

Fireflare runs as `fireflare-api` on Cloudflare Workers with Browser Rendering, D1, R2, Queues, and Durable Objects bindings.
