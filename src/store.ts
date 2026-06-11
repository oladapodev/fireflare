import type { Env, ScrapeDocument } from "./types";
import { sha256Hex } from "./utils/ids";

type JobStatus = "queued" | "running" | "processing" | "completed" | "failed" | "cancelled";

interface JobRow {
  id: string;
  kind: string;
  status: JobStatus;
  input_json: string;
  result_key: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export class Store {
  constructor(private readonly env: Env) {}

  async createJob(id: string, kind: string, input: unknown): Promise<void> {
    await this.env.DB.prepare(
      "INSERT INTO fireflare_jobs (id, kind, status, input_json) VALUES (?, ?, ?, ?)",
    )
      .bind(id, kind, "queued", JSON.stringify(input))
      .run();
  }

  async markJobRunning(id: string): Promise<void> {
    await this.updateJob(id, "running");
  }

  async completeJob(
    id: string,
    resultKey: string,
    status: Exclude<JobStatus, "queued" | "running"> = "completed",
  ): Promise<void> {
    await this.env.DB.prepare(
      "UPDATE fireflare_jobs SET status = ?, result_key = ?, error = NULL, updated_at = ? WHERE id = ?",
    )
      .bind(status, resultKey, new Date().toISOString(), id)
      .run();
  }

  async saveJobResult(id: string, result: unknown, status: Exclude<JobStatus, "queued" | "running"> = "completed"): Promise<string> {
    const resultKey = await this.putJson(`jobs/${id}/result.json`, result);
    await this.completeJob(id, resultKey, status);
    return resultKey;
  }

  async failJob(id: string, error: string): Promise<void> {
    await this.env.DB.prepare(
      "UPDATE fireflare_jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?",
    )
      .bind("failed", error, new Date().toISOString(), id)
      .run();
  }

  async cancelJob(id: string, error?: string): Promise<void> {
    await this.env.DB.prepare(
      "UPDATE fireflare_jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?",
    )
      .bind("cancelled", error ?? "cancelled", new Date().toISOString(), id)
      .run();
  }

  async getJob(id: string): Promise<Record<string, unknown> | null> {
    const row = await this.env.DB.prepare("SELECT * FROM fireflare_jobs WHERE id = ?").bind(id).first();
    return row ? (row as Record<string, unknown>) : null;
  }

  async getJobRecord(id: string): Promise<JobRow | null> {
    const row = await this.env.DB.prepare(
      "SELECT id, kind, status, input_json, result_key, error, created_at, updated_at FROM fireflare_jobs WHERE id = ?",
    )
      .bind(id)
      .first<JobRow>();
    return row ?? null;
  }

  async getJobStatus(id: string): Promise<JobStatus | null> {
    const row = await this.env.DB.prepare("SELECT status FROM fireflare_jobs WHERE id = ?")
      .bind(id)
      .first<{ status: JobStatus }>();
    return row?.status ?? null;
  }

  async getJobResult<T>(id: string): Promise<T | null> {
    const job = await this.getJobRecord(id);
    if (!job || !job.result_key) return null;
    const object = await this.env.ARTIFACTS.get(job.result_key);
    if (!object) return null;
    try {
      return (await object.json()) as T;
    } catch {
      return null;
    }
  }

  async getJobsByKindsAndStatus(kinds: string[], statuses: string[]): Promise<Array<{ id: string; kind: string; status: string; input_json: string; created_at: string }>> {
    if (kinds.length === 0 || statuses.length === 0) return [];
    const kindPlaceholders = kinds.map(() => "?").join(", ");
    const statusPlaceholders = statuses.map(() => "?").join(", ");
    const rows = await this.env.DB.prepare(
      `SELECT id, kind, status, input_json, created_at FROM fireflare_jobs WHERE kind IN (${kindPlaceholders}) AND status IN (${statusPlaceholders}) ORDER BY created_at DESC`,
    )
      .bind(...kinds, ...statuses)
      .all<{ id: string; kind: string; status: string; input_json: string; created_at: string }>();

    return rows.results ?? [];
  }

  async putJson(key: string, value: unknown): Promise<string> {
    await this.env.ARTIFACTS.put(key, JSON.stringify(value), {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });
    return key;
  }

  async putText(key: string, value: string, contentType = "text/plain; charset=utf-8"): Promise<string> {
    await this.env.ARTIFACTS.put(key, value, { httpMetadata: { contentType } });
    return key;
  }

  async putBytes(key: string, value: ArrayBuffer, contentType: string): Promise<string> {
    await this.env.ARTIFACTS.put(key, value, { httpMetadata: { contentType } });
    return key;
  }

  async saveDocument(jobId: string | null, document: ScrapeDocument): Promise<string> {
    const id = await sha256Hex(`${document.url}:${Date.now()}:${crypto.randomUUID()}`);
    const base = `documents/${id}`;
    const markdownKey = document.markdown ? await this.putText(`${base}/markdown.md`, document.markdown, "text/markdown; charset=utf-8") : null;
    const html = document.rawHtml ?? document.html;
    const htmlKey = html ? await this.putText(`${base}/page.html`, html, "text/html; charset=utf-8") : null;
    let screenshotKey: string | null = null;

    if (document.screenshot?.startsWith("data:")) {
      const comma = document.screenshot.indexOf(",");
      const contentType = document.screenshot.slice(5, comma).split(";")[0] || "image/png";
      const bytes = Uint8Array.from(atob(document.screenshot.slice(comma + 1)), c => c.charCodeAt(0));
      screenshotKey = await this.putBytes(`${base}/screenshot`, bytes.buffer, contentType);
    }

    await this.env.DB.prepare(
      "INSERT INTO fireflare_documents (id, job_id, url, title, markdown_key, html_key, screenshot_key, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        id,
        jobId,
        document.url,
        document.title ?? null,
        markdownKey,
        htmlKey,
        screenshotKey,
        JSON.stringify(document.metadata),
      )
      .run();

    return id;
  }

  private async updateJob(id: string, status: string): Promise<void> {
    await this.env.DB.prepare("UPDATE fireflare_jobs SET status = ?, updated_at = ? WHERE id = ?")
      .bind(status, new Date().toISOString(), id)
      .run();
  }
}
