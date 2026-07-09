import type { BrowserProvider } from "./types";
import { CloudflareBrowserProvider } from "./cloudflare";
import { KernelBrowserProvider } from "./kernel";
import type { Env, ScrapeRequest } from "../types";

export function getBrowserProvider(
  env: Env,
  request?: Pick<ScrapeRequest, "browserProvider" | "engine">,
): BrowserProvider {
  // engine:"fetch" is a raw-fetch escape hatch implemented in the Cloudflare
  // provider; honor it regardless of the configured browser provider.
  if (request?.engine === "fetch") return new CloudflareBrowserProvider(env);

  const provider = request?.browserProvider ?? env.BROWSER_PROVIDER ?? "cloudflare";
  if (provider === "kernel") return new KernelBrowserProvider(env);
  // Benchmarks show Cloudflare Browser Rendering beats Kernel for single scrapes
  // (in-network quickAction vs 3 round-trips to the Kernel API). Default "auto"
  // to Cloudflare; Kernel stays opt-in (and shines for crawl/batch session reuse).
  return new CloudflareBrowserProvider(env);
}
