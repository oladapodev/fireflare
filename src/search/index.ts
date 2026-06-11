import type { Env } from "../types";
import type { SearchProvider } from "./types";
import { BraveSearchProvider } from "./brave";
import { SearxngSearchProvider } from "./searxng";
import { BrowserSearchProvider } from "./browser";

export function getSearchProviders(env: Env): SearchProvider[] {
  if (env.SEARCH_PROVIDER === "brave") return [new BraveSearchProvider(env)];
  if (env.SEARCH_PROVIDER === "searxng") return [new SearxngSearchProvider(env)];
  if (env.SEARCH_PROVIDER === "browser") return [new BrowserSearchProvider(env)];

  const providers: SearchProvider[] = [];
  if (env.BRAVE_SEARCH_API_KEY) providers.push(new BraveSearchProvider(env));
  if (env.SEARXNG_ENDPOINT) providers.push(new SearxngSearchProvider(env));
  providers.push(new BrowserSearchProvider(env));
  return providers;
}
