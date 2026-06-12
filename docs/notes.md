# Implementation Notes

## Standalone posture

This repo is no longer a full upstream mono-repo clone.
It keeps the core API surface and runtime wiring, and runs as standalone
Cloudflare deployment for scraping and crawling.

## Documentation strategy

- Developer docs live in markdown under `docs/`.
- API reference is exposed at runtime via:
  - `/docs/openapi.json`
  - `/docs/swagger`
- Operational endpoint stays at root `GET /`.

## Deployment check list

1. Ensure KV/Queue/DB/Durable Object bindings exist in wrangler config.
2. Provision `ENVIRONMENT`, `BROWSER_PROVIDER`, `SEARCH_PROVIDER`.
3. Add optional keys:
   - `KERNEL_API_KEY`
   - `BRAVE_SEARCH_API_KEY`
   - `AI_GATEWAY_API_TOKEN`
4. Deploy with `wrangler deploy`.
5. Hit `/docs/swagger` and run `POST /search` smoke test.
