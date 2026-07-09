import type { BrowserProvider, ScrapeManyResult } from "./types";
import type { Env, ScrapeDocument, ScrapeRequest } from "../types";
import { HttpError } from "../utils/http";

type KernelBrowser = {
  session_id: string;
  browser_live_view_url?: string;
};

type KernelExecution = {
  success: boolean;
  result?: unknown;
  error?: string;
  stdout?: string;
  stderr?: string;
};

export class KernelBrowserProvider implements BrowserProvider {
  readonly name = "kernel";
  private readonly apiBase: string;

  constructor(private readonly env: Env) {
    this.apiBase = env.KERNEL_API_BASE ?? "https://api.onkernel.com";
  }

  async scrape(request: ScrapeRequest): Promise<ScrapeDocument> {
    if (!this.env.KERNEL_API_KEY) {
      throw new HttpError(500, "KERNEL_API_KEY is required for Kernel browser provider", "KERNEL_NOT_CONFIGURED");
    }

    const browser = await this.createBrowser(request.url);
    try {
      return await this.runOnSession(browser, request);
    } finally {
      await this.deleteBrowser(browser.session_id).catch(() => undefined);
    }
  }

  /**
   * Scrape many URLs reusing a small pool of Kernel sessions. Each worker holds
   * one browser session and navigates it across multiple URLs, so we pay the
   * (already tiny) spin-up cost once per session instead of once per URL.
   */
  async scrapeMany(
    urls: string[],
    options: Omit<ScrapeRequest, "url">,
    concurrency: number,
    onResult?: (item: ScrapeManyResult) => Promise<void> | void,
  ): Promise<ScrapeManyResult[]> {
    if (!this.env.KERNEL_API_KEY) {
      throw new HttpError(500, "KERNEL_API_KEY is required for Kernel browser provider", "KERNEL_NOT_CONFIGURED");
    }
    const results = new Array<ScrapeManyResult>(urls.length);
    const poolSize = Math.max(1, Math.min(concurrency, urls.length));
    let next = 0;

    const worker = async (): Promise<void> => {
      let browser: KernelBrowser | null = null;
      try {
        while (true) {
          const index = next++;
          if (index >= urls.length) return;
          const url = urls[index]!;
          let item: ScrapeManyResult;
          try {
            if (!browser) browser = await this.createBrowser(url);
            const document = await this.runOnSession(browser, { ...options, url });
            item = { url, index, document };
          } catch (error) {
            item = { url, index, error: error instanceof Error ? error.message : String(error) };
          }
          results[index] = item;
          if (onResult) await onResult(item);
        }
      } finally {
        if (browser) await this.deleteBrowser(browser.session_id).catch(() => undefined);
      }
    };

    await Promise.all(Array.from({ length: poolSize }, () => worker()));
    return results;
  }

  private async runOnSession(browser: KernelBrowser, request: ScrapeRequest): Promise<ScrapeDocument> {
    const formats = request.formats ?? ["markdown"];
    const execution = await this.execute(browser.session_id, buildScrapeScript(request.url, formats, request.waitFor), request.timeout);
    if (!execution.success) {
      throw new HttpError(502, execution.error ?? "Kernel Playwright execution failed", "KERNEL_EXECUTION_FAILED");
    }
    const result = execution.result as Partial<ScrapeDocument>;
    return {
      url: result.url ?? request.url,
      title: result.title,
      markdown: result.markdown,
      html: result.html,
      rawHtml: result.rawHtml,
      screenshot: result.screenshot,
      links: result.links,
      metadata: {
        provider: this.name,
        liveViewUrl: browser.browser_live_view_url ?? null,
        stdout: execution.stdout ?? null,
        stderr: execution.stderr ?? null,
      },
    };
  }

  async links(url: string, limit: number): Promise<string[]> {
    const doc = await this.scrape({ url, formats: ["links"] });
    return (doc.links ?? []).slice(0, limit);
  }

  private async createBrowser(startUrl?: string): Promise<KernelBrowser> {
    const response = await this.fetchJson<KernelBrowser>("/browsers", {
      method: "POST",
      body: JSON.stringify({
        headless: true,
        start_url: startUrl,
        timeout_seconds: 120,
      }),
    });
    if (!response.session_id) {
      throw new HttpError(502, "Kernel did not return session_id", "KERNEL_BAD_RESPONSE");
    }
    return response;
  }

  private async execute(id: string, code: string, timeoutMs?: number): Promise<KernelExecution> {
    return this.fetchJson<KernelExecution>(`/browsers/${encodeURIComponent(id)}/playwright/execute`, {
      method: "POST",
      body: JSON.stringify({
        code,
        timeout_sec: Math.max(1, Math.min(300, Math.ceil((timeoutMs ?? 60000) / 1000))),
      }),
    });
  }

  private async deleteBrowser(id: string): Promise<void> {
    await fetch(`${this.apiBase}/browsers/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: this.headers(false),
    });
  }

  private async fetchJson<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiBase}${path}`, {
      ...init,
      headers: {
        ...this.headers(true),
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new HttpError(response.status, await response.text(), "KERNEL_API_ERROR");
    }
    return response.json<T>();
  }

  private headers(json: boolean): HeadersInit {
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.env.KERNEL_API_KEY}`,
      accept: "application/json",
    };
    if (json) headers["content-type"] = "application/json";
    return headers;
  }
}

function buildScrapeScript(url: string, formats: string[], waitFor?: number): string {
  const wants = new Set(formats);
  const safeUrl = JSON.stringify(url);
  const wait = Math.max(0, Math.min(30000, waitFor ?? 0));
  return `
    await page.goto(${safeUrl}, { waitUntil: 'domcontentloaded', timeout: 45000 });
    ${wait > 0 ? `await page.waitForTimeout(${wait});` : ""}
    const title = await page.title();
    const result = { url: page.url(), title };
    if (${wants.has("html") || wants.has("rawHtml")}) {
      const html = await page.content();
      ${wants.has("rawHtml") ? "result.rawHtml = html;" : "result.html = html;"}
    }
    if (${wants.has("markdown")}) {
      result.markdown = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    }
    if (${wants.has("links")}) {
      result.links = await page.$$eval('a[href]', links => links.map(a => a.href));
    }
    if (${wants.has("screenshot")}) {
      const shot = await page.screenshot({ type: 'png', fullPage: true });
      result.screenshot = 'data:image/png;base64,' + shot.toString('base64');
    }
    return result;
  `;
}
