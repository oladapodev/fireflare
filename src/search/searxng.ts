import type { Env, SearchResult } from "../types";
import type { SearchProvider } from "./types";
import { HttpError } from "../utils/http";

export class SearxngSearchProvider implements SearchProvider {
  readonly name = "searxng";

  constructor(private readonly env: Env) {}

  async search(query: string, limit: number): Promise<SearchResult[]> {
    if (!this.env.SEARXNG_ENDPOINT) {
      throw new HttpError(500, "SEARXNG_ENDPOINT is not configured", "SEARCH_NOT_CONFIGURED");
    }

    const url = new URL(this.env.SEARXNG_ENDPOINT);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("language", "en");

    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) {
      throw new HttpError(response.status, await response.text(), "SEARXNG_SEARCH_ERROR");
    }

    const body = (await response.json()) as {
      results?: Array<{ url: string; title?: string; content?: string }>;
    };
    return (body.results ?? []).slice(0, limit).map(result => ({
      url: result.url,
      title: result.title,
      description: result.content,
      metadata: { provider: this.name },
    }));
  }
}
