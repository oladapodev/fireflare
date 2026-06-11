import type { SearchResult } from "../types";

export interface SearchProvider {
  readonly name: string;
  search(query: string, limit: number): Promise<SearchResult[]>;
}
