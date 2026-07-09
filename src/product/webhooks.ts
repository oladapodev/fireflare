import type { Env, JsonValue } from "../types";
import type { WebhookRecord } from "./data";
import { listWebhooks, now } from "./data";
import { signHmac } from "./security";

export type WebhookEvent = "job.completed" | "job.failed" | "monitor.changed" | "monitor.failed" | "extractor.completed";

export async function fireWebhooks(env: Env, userId: string, event: WebhookEvent, data: Record<string, JsonValue>): Promise<void> {
  const hooks = (await listWebhooks(env, userId)).filter(hook => hook.active && hook.events.split(",").map(x => x.trim()).includes(event));
  await Promise.all(hooks.map(hook => deliver(env, hook, event, data)));
}

async function deliver(env: Env, hook: WebhookRecord, event: WebhookEvent, data: Record<string, JsonValue>): Promise<void> {
  const payload = JSON.stringify({ id: crypto.randomUUID(), event, created_at: now(), data });
  const signature = await signHmac(hook.secret, payload);
  let status = 0;
  let body = "";
  try {
    const response = await fetch(hook.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "spindle-event": event,
        "spindle-signature": `sha256=${signature}`,
      },
      body: payload,
    });
    status = response.status;
    body = (await response.text()).slice(0, 2000);
  } catch (error) {
    body = error instanceof Error ? error.message : String(error);
  }
  await env.DB.prepare(
    "INSERT INTO spindle_webhook_deliveries (id, webhook_id, event, status, response_body) VALUES (?, ?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), hook.id, event, status, body).run();
}
