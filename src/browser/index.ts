import type { BrowserProvider } from "./types";
import { CloudflareBrowserProvider } from "./cloudflare";
import { KernelBrowserProvider } from "./kernel";
import type { Env, ScrapeRequest } from "../types";

export function getBrowserProvider(env: Env, request?: Pick<ScrapeRequest, "browserProvider">): BrowserProvider {
  const provider = request?.browserProvider ?? env.BROWSER_PROVIDER ?? "cloudflare";
  if (provider === "kernel") return new KernelBrowserProvider(env);
  if (
    provider === "auto" &&
    (env.ENVIRONMENT ?? "").toLowerCase().startsWith("dev") &&
    env.KERNEL_API_KEY
  ) {
    return new KernelBrowserProvider(env);
  }
  return new CloudflareBrowserProvider(env);
}
