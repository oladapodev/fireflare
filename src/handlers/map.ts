import { getBrowserProvider } from "../browser";
import type { Env, MapRequest } from "../types";
import { json, readJson } from "../utils/http";

const MAX_MAP_LIMIT = 100000;
const DEFAULT_MAP_LIMIT = 5000;

export async function handleMap(request: Request, env: Env, path: string): Promise<Response> {
  const body = await readJson<Partial<MapRequest>>(request);
  const validation = validateMapBody(body);
  if (!validation.ok) {
    return json(
      {
        success: false,
        code: "BAD_REQUEST",
        error: "Bad Request",
        details: validation.issues,
      },
      { status: 400 },
    );
  }

  const url = validation.value.url;
  const { includeSubdomains, limit } = validation.value;

  const links = await collectLinks(
    getBrowserProvider(env, { browserProvider: "cloudflare" }),
    url,
    limit,
    includeSubdomains,
  );

  const isV2 = path.startsWith("/v2/");
  const linksPayload = isV2
    ? links.map(link => ({
        url: link,
        title: link.replace(/^https?:\/\//, "").split("/")[0],
      }))
    : links;

  return json({
    success: true,
    links: linksPayload,
  });
}

function validateMapBody(body: Partial<MapRequest>): {
  ok: boolean;
  value: {
    url: string;
    includeSubdomains: boolean;
    limit: number;
  };
  issues: Array<{ code: string; path: Array<string | number>; message: string }>;
} {
  const issues: Array<{ code: string; path: Array<string | number>; message: string }> = [];
  let url = "";

  if (typeof body.url !== "string" || body.url.trim().length === 0) {
    issues.push({
      code: "invalid_type",
      path: ["url"],
      message: "url must be a string.",
    });
  } else if (!isValidTopLevelUrl(body.url)) {
    issues.push({
      code: "custom",
      path: ["url"],
      message: "URL must have a valid top-level domain or be a valid path",
    });
  } else {
    url = new URL(body.url).toString();
  }

  if (body.includeSubdomains !== undefined && typeof body.includeSubdomains !== "boolean") {
    issues.push({
      code: "invalid_type",
      path: ["includeSubdomains"],
      message: "includeSubdomains must be a boolean.",
    });
  }

  const rawLimit = body.limit;
  let limit = DEFAULT_MAP_LIMIT;
  if (rawLimit !== undefined) {
    if (typeof rawLimit !== "number" || !Number.isFinite(rawLimit)) {
      issues.push({
        code: "invalid_type",
        path: ["limit"],
        message: "limit must be a number.",
      });
    } else if (!Number.isInteger(rawLimit)) {
      issues.push({
        code: "invalid_type",
        path: ["limit"],
        message: "limit must be an integer.",
      });
    } else if (rawLimit < 1) {
      issues.push({
        code: "too_small",
        path: ["limit"],
        message: "limit must be greater than or equal to 1.",
      });
    } else if (rawLimit > MAX_MAP_LIMIT) {
      issues.push({
        code: "too_big",
        path: ["limit"],
        message: `limit must be less than or equal to ${MAX_MAP_LIMIT}.`,
      });
    } else {
      limit = rawLimit;
    }
  }

  return {
    ok: issues.length === 0,
    value: {
      url,
      includeSubdomains: body.includeSubdomains === undefined ? true : (body.includeSubdomains as boolean),
      limit,
    },
    issues,
  };
}

function isValidTopLevelUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname;
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host);
  } catch {
    return false;
  }
}

async function collectLinks(
  provider: ReturnType<typeof getBrowserProvider>,
  url: string,
  limit: number,
  includeSubdomains: boolean,
): Promise<string[]> {
  const links = await provider.links(url, limit * 2);
  const origin = new URL(url).origin;
  if (includeSubdomains) return links.slice(0, limit);
  return links.filter(link => new URL(link).origin === origin).slice(0, limit);
}
