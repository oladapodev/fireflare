import type { Env, SearchResult } from "../types";
import type { SearchProvider } from "./types";
import { HttpError } from "../utils/http";

export class BraveSearchProvider implements SearchProvider {
  readonly name = "brave";

  constructor(private readonly env: Env) {}

  async search(query: string, limit: number): Promise<SearchResult[]> {
    if (!this.env.BRAVE_SEARCH_API_KEY) {
      throw new HttpError(500, "BRAVE_SEARCH_API_KEY is not configured", "SEARCH_NOT_CONFIGURED");
    }

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(Math.min(limit, 20)));
    url.searchParams.set("text_decorations", "false");

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "x-subscription-token": this.env.BRAVE_SEARCH_API_KEY,
      },
    });
    if (!response.ok) {
      throw new HttpError(response.status, await response.text(), "BRAVE_SEARCH_ERROR");
    }

    const body = (await response.json()) as {
      web?: { results?: Array<{ url: string; title?: string; description?: string }> };
    };
    return (body.web?.results ?? []).slice(0, limit).map(result => ({
      url: result.url,
      title: stripTags(result.title),
      description: stripTags(result.description),
      metadata: { provider: this.name },
    }));
  }
}

function stripTags(value?: string): string | undefined {
  return value?.replace(/<[^>]*>/g, "").trim();
}
