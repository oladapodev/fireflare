import type { ScrapeDocument, ScrapeRequest } from "../types";

export interface ScrapeManyResult {
  url: string;
  index: number;
  document?: ScrapeDocument;
  error?: string;
}

export interface BrowserProvider {
  readonly name: string;
  scrape(request: ScrapeRequest): Promise<ScrapeDocument>;
  links(url: string, limit: number): Promise<string[]>;
  /**
   * Optional batch entry point. Providers that can reuse a browser session
   * across URLs (e.g. Kernel) implement this to avoid per-URL spin-up.
   * `onResult` fires as each URL settles for incremental progress reporting.
   */
  scrapeMany?(
    urls: string[],
    options: Omit<ScrapeRequest, "url">,
    concurrency: number,
    onResult?: (item: ScrapeManyResult) => Promise<void> | void,
  ): Promise<ScrapeManyResult[]>;
}
