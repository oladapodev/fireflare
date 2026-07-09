import type { Context, Next } from "hono";
import type { Env } from "../types";
import { json } from "../utils/http";
import { recordUsage, verifyApiKey } from "./data";

type Authed = { userId: string; apiKeyId: string };

export function readApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return request.headers.get("x-api-key");
}

export async function apiAuthAndMetering(c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> {
  const raw = readApiKey(c.req.raw);
  if (!raw) return json({ success: false, error: "API key required" }, { status: 401 });
  const verified = await verifyApiKey(c.env, raw);
  if (!verified) return json({ success: false, error: "Invalid or inactive API key" }, { status: 401 });
  const auth = { userId: verified.user.id, apiKeyId: verified.key.id };

  let body: Record<string, unknown> = {};
  if (!["GET", "HEAD", "DELETE"].includes(c.req.method)) {
    try {
      body = (await c.req.raw.clone().json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  await next();
  const response = c.res;
  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.clone().json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const meta = metadataFromPayload(payload);
  const credits = response.status >= 400 ? 0 : calculateCredits(c.req.path, body, payload, meta.cacheHit);
  c.executionCtx.waitUntil(recordUsage(c.env, {
    userId: auth.userId,
    apiKeyId: auth.apiKeyId,
    endpoint: c.req.path,
    method: c.req.method,
    status: response.status,
    credits,
    cacheHit: meta.cacheHit,
    provider: meta.provider,
    jobId: meta.jobId,
    metadata: { path: c.req.path },
  }));
}

function metadataFromPayload(payload: Record<string, unknown>): { cacheHit: boolean; provider: string | null; jobId: string | null } {
  const data = payload.data as Record<string, unknown> | undefined;
  const metadata = data?.metadata as Record<string, unknown> | undefined;
  return {
    cacheHit: metadata?.cache === "hit",
    provider: metadata?.provider ? String(metadata.provider) : null,
    jobId: payload.id ? String(payload.id) : metadata?.jobId ? String(metadata.jobId) : null,
  };
}

function calculateCredits(endpoint: string, body: Record<string, unknown>, payload: Record<string, unknown>, cacheHit: boolean): number {
  if (cacheHit) return 0.1;
  if (endpoint.includes("/feedback")) return 0;
  if (/^\/(scrape|extract|crawl)\/[^/]+(\/errors)?$/.test(endpoint)) return 0;
  if (/^\/batch\/scrape\/[^/]+(\/errors)?$/.test(endpoint)) return 0;
  if (endpoint === "/crawl/ongoing" || endpoint === "/crawl/active") return 0;
  if (endpoint.startsWith("/scrape")) return scrapeCredits(body);
  if (endpoint.startsWith("/extract")) return Math.max(1, urls(body).length || 1) * 2;
  if (endpoint.startsWith("/search")) return Math.max(1, Math.ceil(Number(body.limit ?? 10) / 10));
  if (endpoint.startsWith("/map")) return 1;
  if (endpoint.startsWith("/crawl")) return Math.max(1, Number(body.limit ?? resultLength(payload) ?? 1));
  if (endpoint.startsWith("/batch/scrape")) return Math.max(1, urls(body).length || 1) * scrapeCredits(body.scrapeOptions as Record<string, unknown> | undefined ?? body);
  return 0;
}

function scrapeCredits(body: Record<string, unknown>): number {
  const formats = Array.isArray(body.formats) ? body.formats.map(String) : [];
  let credits = body.engine === "fetch" ? 0.25 : 1;
  if (formats.includes("json")) credits = Math.max(credits, 2);
  if (formats.includes("screenshot")) credits += 1;
  return credits;
}

function urls(body: Record<string, unknown>): string[] {
  return Array.isArray(body.urls) ? body.urls.filter(x => typeof x === "string") as string[] : [];
}

function resultLength(payload: Record<string, unknown>): number | null {
  const data = payload.data;
  if (Array.isArray(data)) return data.length;
  return null;
}
