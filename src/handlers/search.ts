import { getBrowserProvider } from "../browser";
import { Store } from "../store";
import { getSearchProviders } from "../search";
import type { Env, ExecutionContextLike, SearchRequest, SearchResult } from "../types";
import { json, readJson } from "../utils/http";
import { newId } from "../utils/ids";

const MAX_SEARCH_LIMIT = 100;
const DEFAULT_SEARCH_LIMIT_V1 = 5;
const DEFAULT_SEARCH_LIMIT_V2 = 10;

export async function handleSearch(
  request: Request,
  env: Env,
  ctx: ExecutionContextLike,
  path: string,
): Promise<Response> {
  const body = await readJson<Partial<SearchRequest>>(request);
  const validation = validateSearchBody(body, path);
  if (!validation.ok) {
    return json(
      {
        success: false,
        error: "Invalid request body",
        details: validation.issues,
      },
      { status: 400 },
    );
  }

  const { query, limit, scrapeOptions } = validation.value;

  const searchId = newId("search");
  const store = new Store(env);
  await store.createJob(searchId, "search", {
    query,
    limit,
    scrapeOptions,
    ...(body as Record<string, unknown>),
  });
  await store.markJobRunning(searchId);

  let results: SearchResult[] = [];
  const errors: string[] = [];

  for (const provider of getSearchProviders(env)) {
    try {
      results = await provider.search(query, limit);
      if (results.length > 0) {
        break;
      }
    } catch (error) {
      errors.push(`${provider.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (scrapeOptions && results.length > 0) {
    const browser = getBrowserProvider(env, scrapeOptions);
    const scraped = await Promise.all(
      results.slice(0, limit).map(async result => {
        try {
          const doc = await browser.scrape({
            ...scrapeOptions,
            url: result.url,
            formats: scrapeOptions.formats ?? ["markdown"],
          });
          return { ...result, markdown: doc.markdown, metadata: { ...(result.metadata ?? {}), scraped: true } };
        } catch (error) {
          return {
            ...result,
            metadata: {
              ...(result.metadata ?? {}),
              scraped: false,
              scrapeError: error instanceof Error ? error.message : String(error),
            },
          };
        }
      }),
    );
    results = scraped;
  }

  const status = errors.length > 0 && results.length === 0 ? "failed" : "completed";
  const positionedResults = results.map((result, index) => ({
    ...result,
    position: index + 1,
  }));

  const isV2 = path.startsWith("/v2/");
  const responseBody = isV2
    ? {
        data: {
          web: positionedResults,
        },
        creditsUsed: results.length > 0 ? 2 : 0,
      }
    : {
        data: results,
      };

  ctx.waitUntil(
    store.saveJobResult(
      searchId,
      {
        id: searchId,
        ...responseBody,
      },
      status,
    ),
  );

  return json({
    success: true,
    id: searchId,
    ...responseBody,
  });
}

function validateSearchBody(
  body: Partial<SearchRequest>,
  path: string,
): {
  ok: boolean;
  value: {
    query: string;
    limit: number;
    scrapeOptions?: SearchRequest["scrapeOptions"];
  };
  issues: Array<{ code: string; path: Array<string | number>; message: string }>;
} {
  const issues: Array<{ code: string; path: Array<string | number>; message: string }> = [];

  if (typeof body.query !== "string") {
    issues.push({
      code: "invalid_type",
      path: ["query"],
      message: "query must be a string.",
    });
  }

  const query = typeof body.query === "string" ? body.query : "";

  const rawLimit = body.limit;
  const defaultLimit = path.startsWith("/v2/") ? DEFAULT_SEARCH_LIMIT_V2 : DEFAULT_SEARCH_LIMIT_V1;
  let limit = defaultLimit;

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
    } else if (rawLimit > MAX_SEARCH_LIMIT) {
      issues.push({
        code: "too_big",
        path: ["limit"],
        message: `limit must be less than or equal to ${MAX_SEARCH_LIMIT}.`,
      });
    } else {
      limit = rawLimit;
    }
  }

  return {
    ok: issues.length === 0,
    value: {
      query,
      limit,
      scrapeOptions: body.scrapeOptions,
    },
    issues,
  };
}
