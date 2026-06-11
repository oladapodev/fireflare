import type { JsonValue } from "../types";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "ERROR",
  ) {
    super(message);
  }
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function notFound(): Response {
  return json({ success: false, error: "Not found" }, { status: 404 });
}

export async function readJson<T>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json", "UNSUPPORTED_MEDIA_TYPE");
  }

  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Malformed JSON body", "BAD_REQUEST_INVALID_JSON");
  }
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `${field} is required`, "BAD_REQUEST");
  }
  return value.trim();
}

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function safeJsonValue(value: unknown): JsonValue {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(safeJsonValue);
  if (typeof value === "object") {
    const out: Record<string, JsonValue> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = safeJsonValue(val);
    }
    return out;
  }
  return String(value);
}

export function sameOriginOrAbsoluteUrl(raw: string): URL {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
    return url;
  } catch {
    throw new HttpError(400, "url must be a valid http(s) URL", "BAD_REQUEST");
  }
}
