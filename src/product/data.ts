import type { Env, JsonValue } from "../types";
import { randomToken, sha256 } from "./security";

export type AccessStatus = "requested" | "approved" | "rejected";

export interface SpindleUser {
  id: string;
  github_id: string;
  github_login: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
  access_status: AccessStatus;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface SessionUser extends SpindleUser {
  session_id: string;
}

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface UsageEvent {
  id: string;
  user_id: string | null;
  api_key_id: string | null;
  endpoint: string;
  method: string;
  status: number;
  credits: number;
  cache_hit: number;
  provider: string | null;
  job_id: string | null;
  created_at: string;
}

export interface WebhookRecord {
  id: string;
  user_id: string;
  name: string;
  url: string;
  secret: string;
  events: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface ExtractorRecord {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  schema_json: string | null;
  formats_json: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractorRunRecord {
  id: string;
  extractor_id: string;
  user_id: string;
  url: string;
  status: string;
  title: string | null;
  result_json: string;
  created_at: string;
  extractor_name?: string;
}

export interface MonitorRecord {
  id: string;
  user_id: string;
  name: string;
  url: string;
  extractor_id: string | null;
  interval_minutes: number;
  active: number;
  last_hash: string | null;
  last_status: string | null;
  next_run_at: string;
  created_at: string;
  updated_at: string;
}

export async function getUserBySession(env: Env, token: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  const hash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.*, s.id AS session_id
     FROM spindle_sessions s
     JOIN spindle_users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).bind(hash, now()).first<SessionUser>();
  return row ?? null;
}

export async function upsertGitHubUser(env: Env, input: {
  githubId: string;
  login: string;
  name?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
  approved: boolean;
}): Promise<SpindleUser> {
  const existing = await env.DB.prepare("SELECT * FROM spindle_users WHERE github_id = ?")
    .bind(input.githubId)
    .first<SpindleUser>();
  const access = input.approved ? "approved" : existing?.access_status ?? "requested";
  if (existing) {
    await env.DB.prepare(
      "UPDATE spindle_users SET github_login = ?, name = ?, avatar_url = ?, email = ?, access_status = ?, updated_at = ? WHERE id = ?",
    ).bind(input.login, input.name ?? null, input.avatarUrl ?? null, input.email ?? null, access, now(), existing.id).run();
    return (await env.DB.prepare("SELECT * FROM spindle_users WHERE id = ?").bind(existing.id).first<SpindleUser>())!;
  }
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO spindle_users (id, github_id, github_login, name, avatar_url, email, access_status, plan)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, input.githubId, input.login, input.name ?? null, input.avatarUrl ?? null, input.email ?? null, access, "private_beta").run();
  return (await env.DB.prepare("SELECT * FROM spindle_users WHERE id = ?").bind(id).first<SpindleUser>())!;
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomToken(36);
  await env.DB.prepare("INSERT INTO spindle_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, await sha256(token), new Date(Date.now() + 30 * 86400_000).toISOString())
    .run();
  return token;
}

export async function createAccessRequest(env: Env, userId: string, useCase: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO spindle_access_requests (id, user_id, use_case, status)
     VALUES (?, ?, ?, 'requested')
     ON CONFLICT(user_id) DO UPDATE SET use_case = excluded.use_case, status = 'requested', updated_at = ?`,
  ).bind(crypto.randomUUID(), userId, useCase, now()).run();
}

export async function createApiKey(env: Env, userId: string, name: string): Promise<{ raw: string; record: ApiKeyRecord }> {
  const raw = `sp_${randomToken(32)}`;
  const prefix = raw.slice(0, 10);
  const hash = await sha256(raw);
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO spindle_api_keys (id, user_id, name, key_hash, prefix) VALUES (?, ?, ?, ?, ?)")
    .bind(id, userId, name || "Default key", hash, prefix)
    .run();
  const record = (await env.DB.prepare("SELECT id, user_id, name, prefix, last_used_at, revoked_at, created_at FROM spindle_api_keys WHERE id = ?")
    .bind(id)
    .first<ApiKeyRecord>())!;
  return { raw, record };
}

export async function listApiKeys(env: Env, userId: string): Promise<ApiKeyRecord[]> {
  const rows = await env.DB.prepare(
    "SELECT id, user_id, name, prefix, last_used_at, revoked_at, created_at FROM spindle_api_keys WHERE user_id = ? ORDER BY created_at DESC",
  ).bind(userId).all<ApiKeyRecord>();
  return rows.results ?? [];
}

export async function revokeApiKey(env: Env, userId: string, id: string): Promise<void> {
  await env.DB.prepare("UPDATE spindle_api_keys SET revoked_at = ?, updated_at = ? WHERE user_id = ? AND id = ?")
    .bind(now(), now(), userId, id)
    .run();
}

export async function verifyApiKey(env: Env, raw: string): Promise<{ user: SpindleUser; key: ApiKeyRecord } | null> {
  const hash = await sha256(raw);
  const row = await env.DB.prepare(
    `SELECT k.id, k.user_id, k.name, k.prefix, k.last_used_at, k.revoked_at, k.created_at,
            u.id AS u_id, u.github_id, u.github_login, u.name AS u_name, u.avatar_url, u.email, u.access_status, u.plan, u.created_at AS u_created_at, u.updated_at AS u_updated_at
     FROM spindle_api_keys k
     JOIN spindle_users u ON u.id = k.user_id
     WHERE k.key_hash = ? AND k.revoked_at IS NULL`,
  ).bind(hash).first<Record<string, unknown>>();
  if (!row || row.access_status !== "approved") return null;
  await env.DB.prepare("UPDATE spindle_api_keys SET last_used_at = ?, updated_at = ? WHERE id = ?")
    .bind(now(), now(), row.id)
    .run();
  return {
    key: {
      id: String(row.id),
      user_id: String(row.user_id),
      name: String(row.name),
      prefix: String(row.prefix),
      last_used_at: row.last_used_at ? String(row.last_used_at) : null,
      revoked_at: row.revoked_at ? String(row.revoked_at) : null,
      created_at: String(row.created_at),
    },
    user: {
      id: String(row.u_id),
      github_id: String(row.github_id),
      github_login: String(row.github_login),
      name: row.u_name ? String(row.u_name) : null,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null,
      email: row.email ? String(row.email) : null,
      access_status: row.access_status as AccessStatus,
      plan: String(row.plan),
      created_at: String(row.u_created_at),
      updated_at: String(row.u_updated_at),
    },
  };
}

export async function recordUsage(env: Env, event: {
  userId: string | null;
  apiKeyId: string | null;
  endpoint: string;
  method: string;
  status: number;
  credits: number;
  cacheHit?: boolean;
  provider?: string | null;
  jobId?: string | null;
  metadata?: JsonValue;
}): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO spindle_usage_events
     (id, user_id, api_key_id, endpoint, method, status, credits, cache_hit, provider, job_id, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    event.userId,
    event.apiKeyId,
    event.endpoint,
    event.method,
    event.status,
    event.credits,
    event.cacheHit ? 1 : 0,
    event.provider ?? null,
    event.jobId ?? null,
    JSON.stringify(event.metadata ?? {}),
  ).run();
}

export async function usageSummary(env: Env, userId: string): Promise<{ credits: number; calls: number; cacheHits: number; errors: number }> {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(credits),0) AS credits, COUNT(*) AS calls,
            SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) AS cacheHits,
            SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors
     FROM spindle_usage_events WHERE user_id = ?`,
  ).bind(userId).first<{ credits: number; calls: number; cacheHits: number; errors: number }>();
  return row ?? { credits: 0, calls: 0, cacheHits: 0, errors: 0 };
}

export async function listUsage(env: Env, userId: string, limit = 50): Promise<UsageEvent[]> {
  const rows = await env.DB.prepare("SELECT * FROM spindle_usage_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .bind(userId, limit)
    .all<UsageEvent>();
  return rows.results ?? [];
}

export async function listJobs(env: Env, userId: string, limit = 50): Promise<Array<Record<string, unknown>>> {
  const rows = await env.DB.prepare(
    `SELECT j.id, j.kind, j.status, j.created_at, j.updated_at, j.error, u.credits
     FROM fireflare_jobs j
     LEFT JOIN spindle_usage_events u ON u.job_id = j.id
     WHERE u.user_id = ?
     ORDER BY j.created_at DESC LIMIT ?`,
  ).bind(userId, limit).all<Record<string, unknown>>();
  return rows.results ?? [];
}

export async function listWebhooks(env: Env, userId: string): Promise<WebhookRecord[]> {
  const rows = await env.DB.prepare("SELECT * FROM spindle_webhooks WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all<WebhookRecord>();
  return rows.results ?? [];
}

export async function upsertWebhook(env: Env, userId: string, form: FormData): Promise<void> {
  const id = String(form.get("id") || crypto.randomUUID());
  const name = String(form.get("name") || "Webhook");
  const url = String(form.get("url") || "");
  const events = String(form.get("events") || "job.completed,job.failed,monitor.changed,monitor.failed,extractor.completed");
  const active = form.get("active") === "on" ? 1 : 0;
  const existing = await env.DB.prepare("SELECT secret FROM spindle_webhooks WHERE id = ? AND user_id = ?").bind(id, userId).first<{ secret: string }>();
  await env.DB.prepare(
    `INSERT INTO spindle_webhooks (id, user_id, name, url, secret, events, active)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, url = excluded.url, events = excluded.events, active = excluded.active, updated_at = ?`,
  ).bind(id, userId, name, url, existing?.secret ?? randomToken(24), events, active, now()).run();
}

export async function deleteOwned(env: Env, table: string, userId: string, id: string): Promise<void> {
  if (!/^spindle_(webhooks|extractors|monitors)$/.test(table)) return;
  await env.DB.prepare(`DELETE FROM ${table} WHERE user_id = ? AND id = ?`).bind(userId, id).run();
}

export async function listExtractors(env: Env, userId: string): Promise<ExtractorRecord[]> {
  const rows = await env.DB.prepare("SELECT * FROM spindle_extractors WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all<ExtractorRecord>();
  return rows.results ?? [];
}

export async function upsertExtractor(env: Env, userId: string, form: FormData): Promise<void> {
  const id = String(form.get("id") || crypto.randomUUID());
  const formats = String(form.get("formats") || "json,markdown").split(",").map(x => x.trim()).filter(Boolean);
  await env.DB.prepare(
    `INSERT INTO spindle_extractors (id, user_id, name, prompt, schema_json, formats_json)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, prompt = excluded.prompt, schema_json = excluded.schema_json, formats_json = excluded.formats_json, updated_at = ?`,
  ).bind(
    id,
    userId,
    String(form.get("name") || "Extractor"),
    String(form.get("prompt") || "Extract structured data from this page."),
    String(form.get("schema_json") || "") || null,
    JSON.stringify(formats),
    now(),
  ).run();
}

export async function listExtractorRuns(env: Env, userId: string): Promise<ExtractorRunRecord[]> {
  const rows = await env.DB.prepare(
    `SELECT r.*, e.name AS extractor_name FROM spindle_extractor_runs r
     JOIN spindle_extractors e ON e.id = r.extractor_id
     WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 25`,
  ).bind(userId).all<ExtractorRunRecord>();
  return rows.results ?? [];
}

export async function saveExtractorRun(env: Env, input: { extractorId: string; userId: string; url: string; status: string; title?: string | null; result: unknown }): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO spindle_extractor_runs (id, extractor_id, user_id, url, status, title, result_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), input.extractorId, input.userId, input.url, input.status, input.title ?? null, JSON.stringify(input.result)).run();
}

export async function listMonitors(env: Env, userId: string): Promise<MonitorRecord[]> {
  const rows = await env.DB.prepare("SELECT * FROM spindle_monitors WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all<MonitorRecord>();
  return rows.results ?? [];
}

export async function dueMonitors(env: Env, limit = 10): Promise<MonitorRecord[]> {
  const rows = await env.DB.prepare("SELECT * FROM spindle_monitors WHERE active = 1 AND next_run_at <= ? ORDER BY next_run_at ASC LIMIT ?")
    .bind(now(), limit)
    .all<MonitorRecord>();
  return rows.results ?? [];
}

export async function upsertMonitor(env: Env, userId: string, form: FormData): Promise<void> {
  const id = String(form.get("id") || crypto.randomUUID());
  const interval = Math.max(60, Number(form.get("interval_minutes") || 1440));
  const active = form.get("active") === "on" ? 1 : 0;
  await env.DB.prepare(
    `INSERT INTO spindle_monitors (id, user_id, name, url, extractor_id, interval_minutes, active, next_run_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, url = excluded.url, extractor_id = excluded.extractor_id,
       interval_minutes = excluded.interval_minutes, active = excluded.active, updated_at = ?`,
  ).bind(
    id,
    userId,
    String(form.get("name") || "Monitor"),
    String(form.get("url") || ""),
    String(form.get("extractor_id") || "") || null,
    interval,
    active,
    new Date(Date.now() + interval * 60_000).toISOString(),
    now(),
  ).run();
}

export async function recentMonitorRuns(env: Env, userId: string): Promise<Array<Record<string, unknown>>> {
  const rows = await env.DB.prepare(
    `SELECT r.*, m.name AS monitor_name FROM spindle_monitor_runs r
     JOIN spindle_monitors m ON m.id = r.monitor_id
     WHERE m.user_id = ? ORDER BY r.created_at DESC LIMIT 25`,
  ).bind(userId).all<Record<string, unknown>>();
  return rows.results ?? [];
}

export function now(): string {
  return new Date().toISOString();
}
