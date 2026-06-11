import type { ScrapeDocument, ScrapeRequest } from "../types";

export interface BrowserProvider {
  readonly name: string;
  scrape(request: ScrapeRequest): Promise<ScrapeDocument>;
  links(url: string, limit: number): Promise<string[]>;
}
