# Getting Started

Base URL:

```text
https://spindle-api.oladapo.workers.dev
```

Create an account first, then generate an API key from the dashboard:

[Get API key](https://spindle-api.oladapo.workers.dev/request-access)

Health check:

```bash
curl https://spindle-api.oladapo.workers.dev
```

Schema:

```bash
curl https://spindle-api.oladapo.workers.dev/openapi.json
```

The Worker redirects `/docs` to this GitHub Pages site. It does not serve a custom HTML docs app.
`/docs` is not a UI shell with hand-authored Swagger HTML.

`/openapi.json` is generated from the Chanfana route classes at runtime.

## Local Development

```bash
PATH=/home/dev/.bun/bin:$PATH bun install
PATH=/home/dev/.bun/bin:$PATH bun run typecheck
PATH=/home/dev/.bun/bin:$PATH bun run dev
```

Use Worker KV/Queue/D1/R2 bindings from `wrangler.jsonc` before running local tests.

## Deploy

```bash
PATH=/home/dev/.bun/bin:$PATH bun run typecheck
PATH=/home/dev/.bun/bin:$PATH bun run deploy
```

Expected deploy output:

1. Worker URL printed.
2. Route list includes `/openapi.json`.
3. Docs redirect returns 302 from `/docs` to GitHub Pages.

## Useful checks

```bash
curl -f https://spindle-api.oladapo.workers.dev/openapi.json
curl -I https://spindle-api.oladapo.workers.dev/docs
```
