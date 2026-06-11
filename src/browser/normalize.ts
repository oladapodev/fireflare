export async function normalizeQuickActionResult(result: unknown): Promise<unknown> {
  if (result instanceof Response) {
    const contentType = result.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) return result.json();
    if (contentType.startsWith("image/") || contentType.includes("application/pdf")) {
      const bytes = await result.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
      return `data:${contentType};base64,${base64}`;
    }
    return result.text();
  }
  return result;
}

export function stringFromUnknown(value: unknown, keys: string[]): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      const nested = record[key];
      if (typeof nested === "string") return nested;
    }
  }
  return undefined;
}

export function linksFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(linkToUrl).filter((x): x is string => Boolean(x));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["links", "data", "result", "urls"]) {
      if (Array.isArray(record[key])) return record[key].map(linkToUrl).filter((x): x is string => Boolean(x));
    }
  }
  return [];
}

function linkToUrl(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.url === "string") return record.url;
    if (typeof record.href === "string") return record.href;
  }
  return null;
}
