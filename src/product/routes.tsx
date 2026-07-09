/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import type { Context } from "hono";
import type { Env } from "../types";
import { getBrowserProvider } from "../browser";
import { json } from "../utils/http";
import {
  createAccessRequest,
  createApiKey,
  deleteOwned,
  getUserBySession,
  listApiKeys,
  listExtractorRuns,
  listExtractors,
  listJobs,
  listMonitors,
  listUsage,
  listWebhooks,
  recentMonitorRuns,
  recordUsage,
  revokeApiKey,
  saveExtractorRun,
  upsertExtractor,
  upsertGitHubUser,
  upsertMonitor,
  upsertWebhook,
  usageSummary,
  createSession,
  type SessionUser,
} from "./data";
import { clearCookie, getCookie, randomToken, sessionCookie, stateCookie } from "./security";
import { runMonitorById } from "./monitors";
import { fireWebhooks } from "./webhooks";
import {
  DemoResult,
  ExtractorsPage,
  JobsPage,
  KeysPage,
  MarketingPage,
  MonitorsPage,
  OverviewPage,
  PendingPage,
  PlaygroundPage,
  PricingPage,
  RequestAccessPage,
  SettingsPage,
  UsagePage,
  WebhooksPage,
} from "./pages";

export const productRoutes = new Hono<{ Bindings: Env }>();

productRoutes.get("/", async c => c.html(<MarketingPage user={await optionalUser(c)} />));
productRoutes.get("/pricing", async c => c.html(<PricingPage user={await optionalUser(c)} />));
productRoutes.get("/playground", async c => c.html(<PlaygroundPage user={await optionalUser(c)} />));
productRoutes.post("/api/demo/playground", async c => {
  const form = await c.req.formData();
  return c.html(<DemoResult mode={String(form.get("mode") ?? "scrape")} input={String(form.get("input") ?? "")} formats={String(form.get("formats") ?? "markdown")} />);
});

productRoutes.get("/request-access", async c => c.html(<RequestAccessPage user={await optionalUser(c)} submitted={c.req.query("submitted") === "1"} />));
productRoutes.post("/request-access", async c => {
  const user = await optionalUser(c);
  if (!user) return c.redirect("/auth/github");
  const form = await c.req.formData();
  await createAccessRequest(c.env, user.id, String(form.get("use_case") ?? ""));
  return c.redirect("/request-access?submitted=1");
});

productRoutes.get("/auth/github", c => {
  if (!c.env.GITHUB_CLIENT_ID) return c.text("GITHUB_CLIENT_ID is not configured", 500);
  const state = randomToken(18);
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", c.env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", new URL("/auth/github/callback", c.req.url).toString());
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  const headers = new Headers({ location: url.toString() });
  headers.append("set-cookie", stateCookie(state));
  return new Response(null, { status: 302, headers });
});

productRoutes.get("/auth/github/callback", async c => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  if (!code || !state || state !== getCookie(c.req.raw, "spindle_oauth_state")) return c.text("Invalid OAuth state", 400);
  if (!c.env.GITHUB_CLIENT_ID || !c.env.GITHUB_CLIENT_SECRET) return c.text("GitHub OAuth is not configured", 500);

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ client_id: c.env.GITHUB_CLIENT_ID, client_secret: c.env.GITHUB_CLIENT_SECRET, code, redirect_uri: new URL("/auth/github/callback", c.req.url).toString() }),
  });
  const token = await tokenRes.json<{ access_token?: string; error?: string }>();
  if (!token.access_token) return c.text(token.error ?? "OAuth token exchange failed", 400);

  const profile = await fetch("https://api.github.com/user", { headers: { authorization: `Bearer ${token.access_token}`, accept: "application/vnd.github+json", "user-agent": "spindle" } }).then(r => r.json<{ id: number; login: string; name?: string; avatar_url?: string; email?: string | null }>());
  const user = await upsertGitHubUser(c.env, { githubId: String(profile.id), login: profile.login, name: profile.name, avatarUrl: profile.avatar_url, email: profile.email, approved: true });
  const session = await createSession(c.env, user.id);
  const headers = new Headers({ location: "/dashboard" });
  headers.append("set-cookie", sessionCookie(session));
  headers.append("set-cookie", clearCookie("spindle_oauth_state"));
  return new Response(null, { status: 302, headers });
});

productRoutes.get("/auth/logout", c => new Response(null, { status: 302, headers: { location: "/", "set-cookie": clearCookie("spindle_session") } }));

productRoutes.get("/auth/dev", async c => {
  if (!isLocalDevAuthAllowed(c)) return c.notFound();
  const user = await upsertGitHubUser(c.env, {
    githubId: "local-dev",
    login: "local-dev",
    name: "Local Developer",
    avatarUrl: null,
    email: "local@spindle.dev",
    approved: true,
  });
  const session = await createSession(c.env, user.id);
  return new Response(null, {
    status: 302,
    headers: {
      location: "/dashboard",
      "set-cookie": sessionCookie(session, 60 * 60 * 24),
    },
  });
});

productRoutes.get("/dashboard", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  return c.html(<OverviewPage user={user} summary={await usageSummary(c.env, user.id)} monitors={await listMonitors(c.env, user.id)} />);
});
productRoutes.get("/dashboard/keys", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  return c.html(<KeysPage user={user} keys={await listApiKeys(c.env, user.id)} />);
});
productRoutes.get("/dashboard/usage", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  return c.html(<UsagePage user={user} events={await listUsage(c.env, user.id)} summary={await usageSummary(c.env, user.id)} />);
});
productRoutes.get("/dashboard/jobs", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  return c.html(<JobsPage user={user} jobs={await listJobs(c.env, user.id)} />);
});
productRoutes.get("/dashboard/webhooks", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  return c.html(<WebhooksPage user={user} webhooks={await listWebhooks(c.env, user.id)} />);
});
productRoutes.get("/dashboard/extractors", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  return c.html(<ExtractorsPage user={user} extractors={await listExtractors(c.env, user.id)} runs={await listExtractorRuns(c.env, user.id)} />);
});
productRoutes.get("/dashboard/monitors", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  return c.html(<MonitorsPage user={user} monitors={await listMonitors(c.env, user.id)} extractors={await listExtractors(c.env, user.id)} runs={await recentMonitorRuns(c.env, user.id)} />);
});
productRoutes.get("/dashboard/settings", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  return c.html(<SettingsPage user={user} />);
});

productRoutes.post("/api/dashboard/keys", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  const form = await c.req.formData();
  const created = await createApiKey(c.env, user.id, String(form.get("name") ?? "Default key"));
  return c.html(<KeysPage user={user} keys={await listApiKeys(c.env, user.id)} raw={created.raw} />);
});
productRoutes.post("/api/dashboard/keys/:id/revoke", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  await revokeApiKey(c.env, user.id, c.req.param("id"));
  return c.redirect("/dashboard/keys");
});
productRoutes.post("/api/dashboard/webhooks", saveForm("webhooks"));
productRoutes.post("/api/dashboard/extractors", saveForm("extractors"));
productRoutes.post("/api/dashboard/monitors", saveForm("monitors"));
productRoutes.post("/api/dashboard/webhooks/:id", remove("spindle_webhooks", "/dashboard/webhooks"));
productRoutes.post("/api/dashboard/extractors/:id", remove("spindle_extractors", "/dashboard/extractors"));
productRoutes.post("/api/dashboard/monitors/:id", remove("spindle_monitors", "/dashboard/monitors"));

productRoutes.post("/api/dashboard/extractors/:id/run", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  const form = await c.req.formData();
  const url = String(form.get("url") ?? "");
  const extractor = await c.env.DB.prepare("SELECT * FROM spindle_extractors WHERE user_id = ? AND id = ?").bind(user.id, c.req.param("id")).first<{ prompt: string; formats_json: string }>();
  if (!extractor || !url) return c.redirect("/dashboard/extractors");
  const formats = JSON.parse(extractor.formats_json) as Array<"markdown" | "html" | "rawHtml" | "screenshot" | "json" | "links">;
  const document = await getBrowserProvider(c.env, { browserProvider: "auto" }).scrape({ url, formats, jsonPrompt: extractor.prompt, maxAge: 0 });
  await saveExtractorRun(c.env, { extractorId: c.req.param("id"), userId: user.id, url, status: "completed", title: document.title, result: document });
  await recordUsage(c.env, { userId: user.id, apiKeyId: null, endpoint: "extractor.run", method: "POST", status: 200, credits: formats.includes("json") ? 2 : 1, provider: document.metadata?.provider ? String(document.metadata.provider) : null, metadata: { extractorId: c.req.param("id"), url } });
  await fireWebhooks(c.env, user.id, "extractor.completed", { extractorId: c.req.param("id"), url, title: document.title ?? "" });
  return c.redirect("/dashboard/extractors");
});
productRoutes.post("/api/dashboard/monitors/:id/run", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  await runMonitorById(c.env, user.id, c.req.param("id"));
  return c.redirect("/dashboard/monitors");
});
productRoutes.post("/api/dashboard/webhooks/:id/test", async c => {
  const user = await dashboardUser(c);
  if (user instanceof Response) return user;
  const hook = await c.env.DB.prepare("SELECT id FROM spindle_webhooks WHERE id = ? AND user_id = ?").bind(c.req.param("id"), user.id).first<{ id: string }>();
  if (!hook) return json({ success: false, error: "Webhook not found" }, { status: 404 });
  await fireWebhooks(c.env, user.id, "job.completed", { test: true, webhookId: hook.id });
  return c.redirect("/dashboard/webhooks");
});

function saveForm(kind: "webhooks" | "extractors" | "monitors") {
  return async (c: Context<{ Bindings: Env }>) => {
    const user = await dashboardUser(c);
    if (user instanceof Response) return user;
    const form = await c.req.formData();
    if (kind === "webhooks") await upsertWebhook(c.env, user.id, form);
    if (kind === "extractors") await upsertExtractor(c.env, user.id, form);
    if (kind === "monitors") await upsertMonitor(c.env, user.id, form);
    return c.redirect(`/dashboard/${kind}`);
  };
}

function remove(table: string, redirect: string) {
  return async (c: Context<{ Bindings: Env }>) => {
    const user = await dashboardUser(c);
    if (user instanceof Response) return user;
    await deleteOwned(c.env, table, user.id, String(c.req.param("id")));
    return c.redirect(redirect);
  };
}

async function optionalUser(c: Context<{ Bindings: Env }>): Promise<SessionUser | null> {
  return getUserBySession(c.env, getCookie(c.req.raw, "spindle_session"));
}

async function dashboardUser(c: Context<{ Bindings: Env }>): Promise<SessionUser | Response> {
  const user = await optionalUser(c);
  if (!user) return c.redirect("/auth/github");
  if (user.access_status === "rejected") return c.html(<PendingPage user={user} />, 403);
  return user;
}

function isLocalDevAuthAllowed(c: Context<{ Bindings: Env }>): boolean {
  if (c.env.ENVIRONMENT !== "development") return false;
  const host = new URL(c.req.url).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
