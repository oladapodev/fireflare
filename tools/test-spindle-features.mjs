#!/usr/bin/env node
import http from "node:http";

const BASE = process.env.SPINDLE_BASE || "http://localhost:8787";
const REAL_URL = process.env.SPINDLE_TEST_URL || "https://news.ycombinator.com";
const SECOND_URL = process.env.SPINDLE_SECOND_URL || "https://example.com";
const THIRD_URL = process.env.SPINDLE_THIRD_URL || "https://www.iana.org/domains/reserved";
let API_KEY = process.env.SPINDLE_API_KEY || process.argv.find(arg => arg.startsWith("sp_"));

const c = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

const results = [];
let cookie = "";
let webhookHits = [];

function log(section, text, color = c.cyan) {
  console.log(`${color}${section}${c.reset} ${text}`);
}

function ok(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`${c.green}✓${c.reset} ${name}${detail ? ` ${c.dim}${detail}${c.reset}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`${c.red}✗${c.reset} ${name}${detail ? ` ${c.dim}${detail}${c.reset}` : ""}`);
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.SPINDLE_TEST_TIMEOUT_MS || 30000));
  if (cookie) headers.set("cookie", cookie);
  headers.set("connection", "close");
  try {
    const response = await fetch(`${BASE}${path}`, { ...options, headers, redirect: "manual", signal: controller.signal });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function jsonRequest(path, body, key = API_KEY) {
  const response = await request(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { response, json };
}

async function formRequest(path, fields) {
  const body = new URLSearchParams(fields);
  return request(path, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
}

async function ensureDevLogin() {
  const response = await request("/auth/dev");
  if (response.status !== 302 || !cookie) throw new Error(`/auth/dev failed with ${response.status}`);
  ok("local dev login", cookie.replace(/=.*/, "=<hidden>"));
}

async function ensureApiKey() {
  if (API_KEY) {
    ok("api key provided", API_KEY.slice(0, 10) + "...");
    return;
  }
  const response = await formRequest("/api/dashboard/keys", { name: "feature-test" });
  const html = await response.text();
  API_KEY = html.match(/sp_[A-Za-z0-9_-]+/)?.[0];
  if (!API_KEY) throw new Error("Could not create API key from dashboard");
  ok("api key created", API_KEY.slice(0, 10) + "...");
}

async function startWebhookServer() {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      webhookHits.push({ url: req.url, event: req.headers["spindle-event"], signature: req.headers["spindle-signature"], body });
      res.writeHead(204).end();
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { server, url: `http://127.0.0.1:${port}/hook` };
}

function extractId(html, pattern) {
  return html.match(pattern)?.[1] || null;
}

async function pollStatus(path, isDone, attempts = 20, delay = 1500) {
  let last;
  for (let i = 0; i < attempts; i++) {
    const response = await request(path, { headers: { authorization: `Bearer ${API_KEY}` } });
    last = await response.json();
    if (isDone(last)) return last;
    await sleep(delay);
  }
  return last;
}

async function testApi() {
  log("\nAPI", `real URL: ${REAL_URL}`, c.bold + c.blue);

  let r = await request("/scrape", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: REAL_URL }) });
  r.status === 401 ? ok("missing key rejected", "401") : fail("missing key rejected", String(r.status));

  r = await request("/scrape", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer sp_bad" }, body: JSON.stringify({ url: REAL_URL }) });
  r.status === 401 ? ok("bad key rejected", "401") : fail("bad key rejected", String(r.status));

  let out = await jsonRequest("/scrape", { url: REAL_URL, formats: ["markdown", "links"], engine: "fetch", maxAge: 3600 });
  out.response.ok && out.json.success ? ok("scrape real URL", out.json.data?.title || "ok") : fail("scrape real URL", out.json.error || out.response.statusText);

  out = await jsonRequest("/scrape", { url: REAL_URL, formats: ["markdown", "links"], engine: "fetch", maxAge: 3600 });
  out.json.data?.metadata?.cache === "hit" ? ok("cache hit", "metadata.cache=hit") : fail("cache hit", JSON.stringify(out.json.data?.metadata || out.json));

  out = await jsonRequest("/map", { url: REAL_URL, limit: 20, includeSubdomains: true });
  out.response.ok && Array.isArray(out.json.links) ? ok("map links", `${out.json.links.length} links`) : fail("map links", out.json.error || out.response.statusText);

  out = await jsonRequest("/search", { query: "hacker news", limit: 3 });
  const searchId = out.json.id;
  out.response.ok && out.json.data?.web?.length ? ok("search", `${out.json.data.web.length} results`) : fail("search", out.json.error || out.response.statusText);

  if (searchId) {
    out = await jsonRequest(`/search/${searchId}/feedback`, { rating: "good", valuableSources: [{ url: REAL_URL, reason: "feature smoke" }] });
    out.response.ok ? ok("search feedback", `refund=${out.json.creditsRefunded ?? 0}`) : fail("search feedback", out.json.error || out.response.statusText);
  }

  out = await jsonRequest("/extract", { urls: [SECOND_URL], prompt: "Extract title and summary.", scrapeOptions: { formats: ["markdown"], engine: "fetch" } });
  const extractId = out.json.id;
  out.response.ok && extractId ? ok("extract queued", extractId.slice(0, 8)) : fail("extract queued", out.json.error || out.response.statusText);

  if (extractId) {
    const j = await pollStatus(`/extract/${extractId}`, x => x.status === "completed" || x.status === "failed");
    j.status === "completed" ? ok("extract status", `${j.completed}/${j.total}`) : fail("extract status", JSON.stringify(j));
  }

  out = await jsonRequest("/crawl", { url: REAL_URL, limit: 3, maxDepth: 1, concurrency: 1, scrapeOptions: { formats: ["markdown", "links"], engine: "fetch", maxAge: 3600 } });
  out.response.ok && out.json.status === "completed" ? ok("crawl sync", `${out.json.completed}/${out.json.total}`) : fail("crawl sync", out.json.error || out.response.statusText);

  out = await jsonRequest("/batch/scrape", { urls: [SECOND_URL, THIRD_URL], ignoreInvalidURLs: true, maxConcurrency: 1, scrapeOptions: { formats: ["markdown"], engine: "fetch", maxAge: 3600 } });
  const batchId = out.json.id;
  out.response.ok && batchId ? ok("batch queued", batchId.slice(0, 8)) : fail("batch queued", out.json.error || out.response.statusText);
  if (batchId) {
    const j = await pollStatus(`/batch/scrape/${batchId}`, x => x.status === "completed" || x.status === "failed" || x.status === "cancelled", 30, 1500);
    j.status === "completed" ? ok("batch status", `${j.completed}/${j.total}`) : fail("batch status", JSON.stringify(j));
  }
}

async function testDashboard() {
  log("\nDASHBOARD", "CRUD + runs", c.bold + c.magenta);
  const hookServer = await startWebhookServer();
  try {
    let r = await formRequest("/api/dashboard/webhooks", { name: "Feature test hook", url: hookServer.url, events: "job.completed,monitor.changed,monitor.failed,extractor.completed", active: "on" });
    r.status === 302 ? ok("webhook create", "302 redirect is normal form POST success") : fail("webhook create", String(r.status));
    let page = await request("/dashboard/webhooks");
    let html = await page.text();
    const webhookId = extractId(html, /\/api\/dashboard\/webhooks\/([0-9a-f-]{36})\/test/);
    webhookId ? ok("webhook visible", webhookId.slice(0, 8)) : fail("webhook visible");
    if (webhookId) {
      r = await formRequest(`/api/dashboard/webhooks/${webhookId}/test`, {});
      r.status === 302 ? ok("webhook test", "302 redirect + delivery attempted") : fail("webhook test", String(r.status));
      await sleep(1000);
      webhookHits.length ? ok("webhook received locally", `${webhookHits.length} hit(s), event=${webhookHits.at(-1).event}`) : fail("webhook received locally", "no hit captured");
    }

    r = await formRequest("/api/dashboard/extractors", { name: "HN title summary", prompt: "Extract title and one sentence summary.", formats: "json,markdown" });
    r.status === 302 ? ok("extractor create", "302 redirect is normal") : fail("extractor create", String(r.status));
    page = await request("/dashboard/extractors");
    html = await page.text();
    const extractorId = extractId(html, /\/api\/dashboard\/extractors\/([0-9a-f-]{36})\/run/);
    extractorId ? ok("extractor visible", extractorId.slice(0, 8)) : fail("extractor visible");
    if (extractorId) {
      r = await formRequest(`/api/dashboard/extractors/${extractorId}/run`, { url: REAL_URL });
      r.status === 302 ? ok("extractor run", "302 redirect + saved run") : fail("extractor run", String(r.status));
      page = await request("/dashboard/extractors");
      html = await page.text();
      html.includes("Recent extractor runs") && html.includes("View result") ? ok("extractor result view", "formatted result details present") : fail("extractor result view", "result not rendered");
    }

    r = await formRequest("/api/dashboard/monitors", { name: "HN monitor", url: REAL_URL, interval_minutes: "60", active: "on" });
    r.status === 302 ? ok("monitor create", "302 redirect is normal") : fail("monitor create", String(r.status));
    page = await request("/dashboard/monitors");
    html = await page.text();
    const monitorId = extractId(html, /\/api\/dashboard\/monitors\/([0-9a-f-]{36})\/run/);
    monitorId ? ok("monitor visible", monitorId.slice(0, 8)) : fail("monitor visible");
    if (monitorId) {
      r = await formRequest(`/api/dashboard/monitors/${monitorId}/run`, {});
      r.status === 302 ? ok("monitor run", "302 redirect + run saved") : fail("monitor run", String(r.status));
      page = await request("/dashboard/monitors");
      html = await page.text();
      html.includes("Recent monitor runs") ? ok("monitor result view", "recent run table present") : fail("monitor result view");
    }
  } finally {
    hookServer.server.close();
  }
}

async function main() {
  console.log(`${c.bold}${c.cyan}Spindle feature smoke${c.reset}`);
  console.log(`${c.dim}Base=${BASE} URL=${REAL_URL}${c.reset}`);
  await ensureDevLogin();
  await ensureApiKey();
  await testApi();
  await testDashboard();
  const failed = results.filter(r => !r.ok);
  console.log(`\n${failed.length ? c.red : c.green}${c.bold}${results.length - failed.length}/${results.length} passed${c.reset}`);
  if (failed.length) process.exitCode = 1;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

main().catch(error => {
  console.error(`${c.red}Fatal:${c.reset}`, error);
  process.exit(1);
});
