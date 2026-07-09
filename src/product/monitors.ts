import type { Env, JsonValue, ScrapeDocument } from "../types";
import { getBrowserProvider } from "../browser";
import { recordUsage, dueMonitors, now, type MonitorRecord } from "./data";
import { sha256 } from "./security";
import { fireWebhooks } from "./webhooks";

export async function runDueMonitors(env: Env): Promise<void> {
  const monitors = await dueMonitors(env, 10);
  await Promise.all(monitors.map(monitor => runMonitor(env, monitor)));
}

export async function runMonitorById(env: Env, userId: string, id: string): Promise<void> {
  const monitor = await env.DB.prepare("SELECT * FROM spindle_monitors WHERE user_id = ? AND id = ?")
    .bind(userId, id)
    .first<MonitorRecord>();
  if (monitor) await runMonitor(env, monitor);
}

async function runMonitor(env: Env, monitor: MonitorRecord): Promise<void> {
  let status = "completed";
  let changed = false;
  let diff = "";
  let hash: string | null = null;
  let document: ScrapeDocument | null = null;

  try {
    const extractor = monitor.extractor_id
      ? await env.DB.prepare("SELECT * FROM spindle_extractors WHERE id = ? AND user_id = ?").bind(monitor.extractor_id, monitor.user_id).first<{ prompt: string; formats_json: string }>()
      : null;
    const formats = extractor ? JSON.parse(extractor.formats_json) as string[] : ["markdown"];
    document = await getBrowserProvider(env, { browserProvider: "auto" }).scrape({
      url: monitor.url,
      formats: formats as Array<"markdown" | "html" | "rawHtml" | "screenshot" | "json" | "links">,
      jsonPrompt: extractor?.prompt,
      maxAge: 0,
    });
    const comparable = JSON.stringify({ markdown: document.markdown, json: document.json, links: document.links, title: document.title });
    hash = await sha256(comparable);
    changed = Boolean(monitor.last_hash && monitor.last_hash !== hash);
    diff = changed ? summarizeDiff(monitor.last_hash, hash, document) : "No change detected.";
  } catch (error) {
    status = "failed";
    diff = error instanceof Error ? error.message : String(error);
  }

  await env.DB.prepare(
    `INSERT INTO spindle_monitor_runs (id, monitor_id, status, changed, hash, diff_summary, result_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), monitor.id, status, changed ? 1 : 0, hash, diff, JSON.stringify(document ?? {})).run();

  await env.DB.prepare(
    "UPDATE spindle_monitors SET last_hash = COALESCE(?, last_hash), last_status = ?, next_run_at = ?, updated_at = ? WHERE id = ?",
  ).bind(hash, status, new Date(Date.now() + monitor.interval_minutes * 60_000).toISOString(), now(), monitor.id).run();

  await recordUsage(env, {
    userId: monitor.user_id,
    apiKeyId: null,
    endpoint: "monitor.run",
    method: "SCHEDULED",
    status: status === "completed" ? 200 : 500,
    credits: status === "completed" ? 1 : 0,
    provider: document?.metadata?.provider ? String(document.metadata.provider) : null,
    metadata: { monitorId: monitor.id },
  });

  if (changed) await fireWebhooks(env, monitor.user_id, "monitor.changed", { monitorId: monitor.id, url: monitor.url, diff } as Record<string, JsonValue>);
  if (status === "failed") await fireWebhooks(env, monitor.user_id, "monitor.failed", { monitorId: monitor.id, url: monitor.url, error: diff } as Record<string, JsonValue>);
}

function summarizeDiff(previous: string | null, next: string | null, document: ScrapeDocument | null): string {
  const title = document?.title ? `Title: ${document.title}. ` : "";
  return `${title}Content hash changed from ${previous?.slice(0, 10) ?? "empty"} to ${next?.slice(0, 10) ?? "empty"}.`;
}
