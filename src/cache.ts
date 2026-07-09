import type { Env, ScrapeDocument, ScrapeRequest } from "./types";
import { sha256Hex } from "./utils/ids";

const DEFAULT_MAX_AGE = 3600;

/**
 * Build a stable cache key for a scrape request. Only inputs that change the
 * rendered output are included; formats are sorted so order does not matter.
 */
async function cacheKey(request: ScrapeRequest): Promise<string> {
  const formats = [...(request.formats ?? ["markdown"])].sort();
  const parts = [
    request.url,
    formats.join(","),
    request.waitFor ?? 0,
    request.onlyMainContent ? 1 : 0,
    request.jsonPrompt ?? "",
    request.engine ?? "browser",
  ];
  return `scrape:${await sha256Hex(parts.join("|"))}`;
}

/** Effective TTL in seconds. `maxAge === 0` bypasses the cache entirely. */
export function cacheTtl(request: ScrapeRequest): number {
  return request.maxAge ?? DEFAULT_MAX_AGE;
}

export async function getCached(env: Env, request: ScrapeRequest): Promise<ScrapeDocument | null> {
  if (cacheTtl(request) <= 0) return null;
  const cached = await env.SCRAPE_CACHE.get(await cacheKey(request));
  if (!cached) return null;
  try {
    const document = JSON.parse(cached) as ScrapeDocument;
    document.metadata = { ...document.metadata, cache: "hit" };
    return document;
  } catch {
    return null;
  }
}

export async function putCached(env: Env, request: ScrapeRequest, document: ScrapeDocument): Promise<void> {
  const ttl = cacheTtl(request);
  if (ttl <= 0) return;
  await env.SCRAPE_CACHE.put(await cacheKey(request), JSON.stringify(document), {
    expirationTtl: Math.max(60, ttl),
  });
}
