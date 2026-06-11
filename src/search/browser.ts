import type { Env, SearchResult } from "../types";
import type { SearchProvider } from "./types";
import { getBrowserProvider } from "../browser";

export class BrowserSearchProvider implements SearchProvider {
  readonly name = "browser";

  constructor(private readonly env: Env) {}

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const base = this.env.BROWSER_SEARCH_URL ?? "https://search.brave.com/search?q=";
    const searchUrl = `${base}${encodeURIComponent(query)}`;
    const provider = getBrowserProvider(this.env, { browserProvider: "cloudflare" });
    let links = await provider.links(searchUrl, limit * 4);

    if (links.length === 0) {
      links = await directSearchLinks(searchUrl, limit * 6);
    }

    return dedupe(links)
      .filter(url => !isSearchChrome(url))
      .slice(0, limit)
      .map(url => ({
        url,
        title: url,
        metadata: { provider: this.name, searchUrl },
      }));
  }
}

async function directSearchLinks(searchUrl: string, limit: number): Promise<string[]> {
  const response = await fetch(searchUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 FireflareBot/0.1",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) return [];

  const html = await response.text();
  const links: string[] = [];
  const hrefPattern = /\bhref=(["'])(.*?)\1/g;
  let match: RegExpExecArray | null;

  while ((match = hrefPattern.exec(html)) && links.length < limit) {
    const url = decodeHtml(match[2]);
    if (!url.startsWith("http://") && !url.startsWith("https://")) continue;
    links.push(url);
  }

  return links;
}

function dedupe(urls: string[]): string[] {
  return [...new Set(urls)];
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function isSearchChrome(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.includes("brave.com") || host.includes("google.") || host.includes("bing.com");
  } catch {
    return true;
  }
}
