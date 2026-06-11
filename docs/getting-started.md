---
layout: default
title: Getting Started
nav_order: 2
---

# Getting Started

Base URL:

```text
https://fireflare-api.oladapo.workers.dev
```

Health check:

```bash
curl https://fireflare-api.oladapo.workers.dev
```

Schema:

```bash
curl https://fireflare-api.oladapo.workers.dev/openapi.json
```

The Worker redirects `/docs` to this GitHub Pages site. It does not serve a custom HTML docs app.

## Local Development

```bash
npm install
npm run db:migrate:local
npm run dev
```

## Deploy

```bash
npm run typecheck
npm run deploy
```
