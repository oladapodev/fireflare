import type { BrowserProvider } from "./types";
import type { Env, ScrapeDocument, ScrapeRequest } from "../types";
import { linksFromUnknown, normalizeQuickActionResult, stringFromUnknown } from "./normalize";

export class CloudflareBrowserProvider implements BrowserProvider {
  readonly name = "cloudflare";

  constructor(private readonly env: Env) {}

  async scrape(request: ScrapeRequest): Promise<ScrapeDocument> {
    if (request.engine === "fetch") {
      return this.scrapeFallback(request);
    }

    const formats = new Set(request.formats ?? ["markdown"]);
    const metadata: ScrapeDocument["metadata"] = {
      provider: this.name,
      source: "browser-run",
    };

    const document: ScrapeDocument = {
      url: request.url,
      metadata,
    };

    // When both markdown and HTML are requested, fetch HTML once and derive
    // markdown locally instead of paying for a second cold browser call.
    const needsHtml = formats.has("html") || formats.has("rawHtml");
    const deriveMarkdownFromHtml = formats.has("markdown") && needsHtml;

    try {
      const tasks: Promise<void>[] = [];

      if (needsHtml || deriveMarkdownFromHtml) {
        tasks.push(
          (async () => {
            const result = await normalizeQuickActionResult(
              await this.env.BROWSER.quickAction("content", {
                url: request.url,
                waitForTimeout: request.waitFor,
              }),
            );
            const html = stringFromUnknown(result, ["html", "content", "text", "result"]);
            if (formats.has("rawHtml")) document.rawHtml = html;
            if (formats.has("html")) document.html = html;
            if (deriveMarkdownFromHtml) document.markdown = htmlToText(html ?? "");
          })(),
        );
      }

      if (formats.has("markdown") && !deriveMarkdownFromHtml) {
        tasks.push(
          (async () => {
            const result = await normalizeQuickActionResult(
              await this.env.BROWSER.quickAction("markdown", {
                url: request.url,
                waitForTimeout: request.waitFor,
              }),
            );
            document.markdown = stringFromUnknown(result, ["markdown", "content", "text", "result"]);
          })(),
        );
      }

      if (formats.has("links")) {
        tasks.push(
          (async () => {
            document.links = await this.links(request.url, 250);
          })(),
        );
      }

      if (formats.has("json")) {
        tasks.push(
          (async () => {
            const result = await normalizeQuickActionResult(
              await this.env.BROWSER.quickAction("json", {
                url: request.url,
                prompt: request.jsonPrompt ?? "Extract the main page content as structured JSON.",
              }),
            );
            document.json = result as ScrapeDocument["json"];
          })(),
        );
      }

      if (formats.has("screenshot")) {
        tasks.push(
          (async () => {
            const result = await normalizeQuickActionResult(
              await this.env.BROWSER.quickAction("screenshot", {
                url: request.url,
                screenshotOptions: { type: "png", fullPage: true },
              }),
            );
            document.screenshot = stringFromUnknown(result, ["screenshot", "data", "result"]);
          })(),
        );
      }

      await Promise.all(tasks);
    } catch (error) {
      if (!isQuickActionUnavailable(error)) {
        throw error;
      }
      const fallback = await this.scrapeFallback(request);
      return {
        ...fallback,
        markdown: formats.has("markdown") ? fallback.markdown : document.markdown,
        html: formats.has("html") ? fallback.html : document.html,
        rawHtml: formats.has("rawHtml") ? fallback.rawHtml : document.rawHtml,
        links: formats.has("links") ? fallback.links : document.links,
      };
    }

    if (formats.has("json") && !document.json) {
      document.json = undefined;
    }

    document.title = extractTitle(document.html ?? document.rawHtml ?? document.markdown);
    return document;
  }

  async links(url: string, limit: number): Promise<string[]> {
    try {
      const result = await normalizeQuickActionResult(await this.env.BROWSER.quickAction("links", { url }));
      return normalizeLinks(linksFromUnknown(result), url).slice(0, limit);
    } catch (error) {
      if (!isQuickActionUnavailable(error)) {
        throw error;
      }
      return this.linksFallback(url, limit);
    }
  }

  private async scrapeFallback(request: ScrapeRequest): Promise<ScrapeDocument> {
    const response = await fetch(request.url);
    const html = await response.text();
    const metadata = {
      provider: this.name,
      source: "browser-run-fallback",
      statusCode: response.status,
      contentType: response.headers.get("content-type"),
      sourceURL: request.url,
    };

    const title = extractTitle(html);
    const fallback: ScrapeDocument = {
      url: response.url,
      title,
      metadata,
    };

    if (request.formats?.includes("markdown") ?? true) {
      fallback.markdown = htmlToText(html);
    }
    if (request.formats?.includes("rawHtml")) {
      fallback.rawHtml = html;
    }
    if (request.formats?.includes("html")) {
      fallback.html = html;
    }
    if (request.formats?.includes("links")) {
      fallback.links = this.linksFromDocument(html, request.url).slice(0, 250);
    }
    return fallback;
  }

  private async linksFallback(url: string, limit: number): Promise<string[]> {
    const response = await fetch(url);
    const html = await response.text();
    return this.linksFromDocument(html, url).slice(0, limit);
  }

  private linksFromDocument(html: string, baseUrl: string): string[] {
    const hrefPattern = /<a[^>]+href=(["'])(.*?)\1/gi;
    const links: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = hrefPattern.exec(html)) && links.length < 5000) {
      const link = decodeHtml(match[2] ?? "").trim();
      if (!link) continue;
      try {
        const normalized = new URL(link, baseUrl);
        if (normalized.protocol !== "http:" && normalized.protocol !== "https:") continue;
        links.push(normalized.toString());
      } catch {
        continue;
      }
    }
    return normalizeLinks(Array.from(new Set(links)), baseUrl);
  }
}

function extractTitle(content?: string): string | undefined {
  if (!content) return undefined;
  const htmlTitle = content.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  if (htmlTitle) return htmlTitle;
  const markdownTitle = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return markdownTitle;
}

function normalizeLinks(links: string[], baseUrl: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const link of links) {
    try {
      const url = new URL(link, baseUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      const key = url.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    } catch {
      continue;
    }
  }
  return out;
}

function isQuickActionUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('RPC receiver does not implement the method "quickAction"');
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ");
}
