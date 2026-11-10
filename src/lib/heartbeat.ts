import { db } from "@/db/client";
import { sql } from "drizzle-orm";

/**
 * Heartbeats: every scheduled job records when it last ran and whether it worked, so `/api/health` can tell a job that
 * stopped from one that is merely quiet. Stored as `integrations` rows keyed `heartbeat.<job>` (value: JSON `{ ok, detail }`,
 * `updated_at`: the run). The nightly backup on the host writes `heartbeat.backup` itself, through psql.
 *
 * Why: the failures that cost days on this site were all silent (WhatsApp codes "accepted" and never delivered for three
 * days, public files 404 for two, lead alerts never sent). A cron that dies writes nothing, so a stale heartbeat is the
 * signal. Recording never throws — a heartbeat must not be the thing that fails a job.
 */
export async function beat(job: string, ok: boolean, detail?: string): Promise<void> {
  const value = JSON.stringify({ ok, detail: detail ? detail.slice(0, 200) : null });
  try {
    await db.execute(sql`
      INSERT INTO integrations (key, value, is_secret, updated_at)
      VALUES (${"heartbeat." + job}, ${value}, false, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `);
  } catch {
    /* the job's own result matters more than its heartbeat */
  }
}

export type Beat = { job: string; ok: boolean; detail: string | null; at: Date };

export async function readBeats(): Promise<Map<string, Beat>> {
  const rows = (await db.execute(sql`
    SELECT key, value, to_json(updated_at)#>>'{}' AS at FROM integrations WHERE key LIKE 'heartbeat.%'
  `)) as unknown as Array<{ key: string; value: string | null; at: string }>;
  const out = new Map<string, Beat>();
  for (const r of rows) {
    const job = r.key.slice("heartbeat.".length);
    let parsed: { ok?: unknown; detail?: unknown; gcs?: unknown } = {};
    try {
      parsed = JSON.parse(r.value ?? "{}");
    } catch {
      /* a malformed row reads as a failed run */
    }
    const gcsFailed = parsed.gcs !== undefined && parsed.gcs !== "ok";
    out.set(job, {
      job,
      ok: parsed.ok === true && !gcsFailed,
      detail: gcsFailed ? `second copy: ${String(parsed.gcs)}` : typeof parsed.detail === "string" ? parsed.detail : null,
      at: new Date(r.at),
    });
  }
  return out;
}
