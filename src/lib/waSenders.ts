/**
 * Every WhatsApp number we can send from, how each one is doing, and which one
 * sends next. Server-only: it reads API keys.
 *
 * ## Why there is more than one
 *
 * On 2026-10-06 WhatsApp logged out the gateway and put a six-hour "reach-out
 * lock" on the only number (RESTRICT_ALL_COMPANIONS): linked devices may not
 * start new chats, and a sign-in code always goes to somebody new. Every code
 * failed until it lifted. With several numbers, a locked or logged-out one is
 * skipped and the next one sends; with all of them out, the caller falls back
 * to the inbound path (the visitor messages us), which no lock touches.
 *
 * ## How a sender is chosen
 *
 * For sign-in codes — messages to strangers, the thing WhatsApp penalises —
 * only numbers that are connected (WORKING), not locked and under their daily
 * cap are eligible, and the one that has sent the fewest codes today goes first
 * (ties by priority). Spreading the load is itself a defence: each number looks
 * less like a machine messaging strangers than one number doing all of it.
 *
 * For lead alerts — messages to our own staff, existing chats — the primary
 * goes first, because that is the chat the team reads, and a lock does not
 * apply. Any connected number is a fallback.
 *
 * The primary is the number configured in /admin/whatsapp (`integrations`),
 * exactly as before; `wa_senders` holds the backups. One WAHA container per
 * number: WAHA Core runs a single session.
 */
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { getIntegration } from "@/lib/integrations";

export const PRIMARY_ID = 0;

/** The primary's cap: generous, as it was, because it is the number the team watches. */
const PRIMARY_DAILY_CAP = 300;

export interface Sender {
  id: number;
  label: string;
  /** Digits with the country code, when known. */
  phone: string | null;
  url: string;
  apiKey: string | null;
  session: string;
  enabled: boolean;
  priority: number;
  dailyCap: number;
  primary: boolean;
  /** When this number was first seen connected — its warm-up runs from here. */
  pairedAt: Date | null;
}

export interface SenderHealth {
  reachable: boolean;
  /** WAHA's session status: WORKING, SCAN_QR_CODE, FAILED, STOPPED… */
  status: string;
  /** The number the session is paired to, digits only. */
  me: string | null;
  locked: boolean;
  lockedUntil: Date | null;
  lockType: string | null;
  error?: string;
}

/* ------------------------------------------------------------------ list */

const LIST_TTL_MS = 30_000;
let listCache: { at: number; senders: Sender[] } | null = null;

/** Drop the cached list — after the admin adds, edits or removes a number. */
export function invalidateSenders() {
  listCache = null;
}

export async function listSenders(): Promise<Sender[]> {
  if (listCache && Date.now() - listCache.at < LIST_TTL_MS) return listCache.senders;

  const [url, key, number] = await Promise.all([
    getIntegration("whatsapp.gateway.url"),
    getIntegration("whatsapp.gateway.api_key"),
    getIntegration("whatsapp.verify.number"),
  ]);
  const senders: Sender[] = [];
  if (url) {
    senders.push({
      id: PRIMARY_ID,
      label: "Primary",
      phone: number?.replace(/\D/g, "") || null,
      url,
      apiKey: key,
      session: "default",
      enabled: true,
      priority: 0,
      dailyCap: PRIMARY_DAILY_CAP,
      primary: true,
      pairedAt: null,
    });
  }

  try {
    const rows = (await db.execute(sql`
      SELECT id, label, phone, gateway_url, api_key, session, enabled, priority, daily_cap, paired_at
        FROM wa_senders ORDER BY priority, id
    `)) as unknown as {
      id: number; label: string; phone: string | null; gateway_url: string; api_key: string | null;
      session: string; enabled: boolean; priority: number; daily_cap: number; paired_at: string | Date | null;
    }[];
    for (const r of rows) {
      senders.push({
        id: r.id,
        label: r.label,
        phone: r.phone,
        url: r.gateway_url,
        apiKey: r.api_key,
        session: r.session || "default",
        enabled: r.enabled,
        priority: r.priority,
        dailyCap: r.daily_cap,
        primary: false,
        pairedAt: r.paired_at ? new Date(r.paired_at) : null,
      });
    }
  } catch {
    // Before migration 0023 the table does not exist: the primary alone, as before.
  }

  listCache = { at: Date.now(), senders };
  return senders;
}

/* ---------------------------------------------------------------- health */

const HEALTH_TTL_MS = 60_000;
const health = new Map<number, { at: number; h: SenderHealth }>();

/** A 463 from this sender: locked now, whatever the session says. */
export function markLocked(id: number) {
  const prev = health.get(id)?.h;
  health.set(id, {
    at: Date.now(),
    h: {
      reachable: true,
      status: prev?.status ?? "WORKING",
      me: prev?.me ?? null,
      locked: true,
      // WhatsApp's own end time arrives with the next session read; until then
      // assume the six hours seen on 2026-10-06.
      lockedUntil: prev?.lockedUntil ?? new Date(Date.now() + 6 * 3600_000),
      lockType: prev?.lockType ?? "463",
    },
  });
}

/** Any other failure: skip it for a minute rather than make every visitor wait on it. */
export function markDown(id: number, error: string) {
  health.set(id, { at: Date.now(), h: { reachable: false, status: "UNREACHABLE", me: null, locked: false, lockedUntil: null, lockType: null, error } });
}

export async function senderHealth(s: Sender, fresh = false): Promise<SenderHealth> {
  const cached = health.get(s.id);
  if (!fresh && cached && Date.now() - cached.at < HEALTH_TTL_MS) return cached.h;
  let h: SenderHealth;
  try {
    const res = await fetch(`${s.url.replace(/\/+$/, "")}/api/sessions/${encodeURIComponent(s.session)}`, {
      headers: s.apiKey ? { "X-Api-Key": s.apiKey } : {},
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      h = {
        reachable: res.status !== 401 && res.status !== 403,
        status: res.status === 404 ? "NO_SESSION" : res.status === 401 || res.status === 403 ? "BAD_KEY" : `HTTP_${res.status}`,
        me: null, locked: false, lockedUntil: null, lockType: null,
        error: `The gateway answered ${res.status}.`,
      };
    } else {
      const j = (await res.json()) as {
        status?: string;
        me?: { id?: string; reachoutTimelock?: { isActive?: boolean; timeEnforcementEnds?: number; enforcementType?: string } };
      };
      const t = j.me?.reachoutTimelock;
      const until = t?.timeEnforcementEnds ? new Date(t.timeEnforcementEnds * 1000) : null;
      const locked = Boolean(t?.isActive) && (!until || until.getTime() > Date.now());
      h = {
        reachable: true,
        status: j.status ?? "UNKNOWN",
        me: j.me?.id ? j.me.id.split("@")[0].replace(/\D/g, "") : null,
        locked,
        lockedUntil: locked ? until : null,
        lockType: locked ? t?.enforcementType ?? null : null,
      };
    }
  } catch (error) {
    h = {
      reachable: false, status: "UNREACHABLE", me: null, locked: false, lockedUntil: null, lockType: null,
      error: error instanceof Error ? error.message.slice(0, 120) : "Could not reach the gateway.",
    };
  }
  health.set(s.id, { at: Date.now(), h });
  if (!s.primary && h.status === "WORKING" && h.me) {
    // First seen connected, or a different phone than before: the warm-up
    // (effectiveCap) starts now.
    if (!s.pairedAt || (s.phone && s.phone !== h.me)) {
      await db
        .execute(sql`UPDATE wa_senders SET paired_at = now(), phone = ${h.me}, updated_at = now() WHERE id = ${s.id}`)
        .catch(() => {});
      invalidateSenders();
    }
  }
  return h;
}

/* ----------------------------------------------------------------- usage */

/** Sign-in codes each number has sent since midnight IST. */
export async function sentToday(): Promise<Map<number, number>> {
  const rows = (await db.execute(sql`
    SELECT COALESCE(sent_via, 0) AS id, COUNT(*)::int AS n
      FROM otp_codes
     WHERE sent_channel = 'whatsapp'
       AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'
     GROUP BY 1
  `).catch(() => [])) as unknown as { id: number; n: number }[];
  return new Map(rows.map((r) => [Number(r.id), Number(r.n)]));
}

/* --------------------------------------------------------------- warm-up */

/**
 * A new number does not start at its full cap.
 *
 * What got the primary locked was a newly linked device messaging strangers
 * within two days of pairing. A backup that is paired today and sends 40 codes
 * tomorrow repeats that exactly. So for its first week a backup's cap is held
 * down — 10 a day for three days, 20 for the next four — counted from when it
 * was first seen connected (paired_at; reset if a different phone is paired).
 * The primary is long-established and keeps its cap.
 */
export function effectiveCap(s: Sender): number {
  if (s.primary) return s.dailyCap;
  // Not yet seen connected counts as paired just now.
  const days = s.pairedAt ? (Date.now() - s.pairedAt.getTime()) / 86_400_000 : 0;
  if (days < 3) return Math.min(s.dailyCap, 10);
  if (days < 7) return Math.min(s.dailyCap, 20);
  return s.dailyCap;
}

/* ---------------------------------------------------------------- choose */

export type Purpose = "otp" | "alert";

/**
 * The senders to try, in order. Empty means nobody can send right now — for a
 * sign-in code, the caller then offers the inbound path.
 */
export async function pickSenders(purpose: Purpose): Promise<Sender[]> {
  const senders = (await listSenders()).filter((s) => s.enabled);
  if (!senders.length) return [];
  const [healths, counts] = await Promise.all([
    Promise.all(senders.map((s) => senderHealth(s))),
    purpose === "otp" ? sentToday() : Promise.resolve(new Map<number, number>()),
  ]);
  const usable = senders
    .map((s, i) => ({ s, h: healths[i], n: counts.get(s.id) ?? 0 }))
    .filter(({ h }) => h.reachable && h.status === "WORKING")
    .filter(({ s, h, n }) => purpose === "alert" || (!h.locked && n < effectiveCap(s)));

  if (purpose === "alert") {
    // The primary first: it is the chat the team reads.
    return usable.sort((a, b) => Number(b.s.primary) - Number(a.s.primary) || a.s.priority - b.s.priority).map((x) => x.s);
  }
  return usable.sort((a, b) => a.n - b.n || a.s.priority - b.s.priority).map((x) => x.s);
}

/**
 * The number a visitor should message for the inbound path: any connected one
 * (a lock does not stop *receiving*), the primary first. Its gateway posts the
 * message to our webhook, whichever number it was.
 */
export async function inboundNumber(): Promise<string | null> {
  const senders = (await listSenders()).filter((s) => s.enabled);
  const healths = await Promise.all(senders.map((s) => senderHealth(s)));
  const ordered = senders
    .map((s, i) => ({ s, h: healths[i] }))
    .filter(({ h }) => h.reachable && h.status === "WORKING")
    .sort((a, b) => Number(b.s.primary) - Number(a.s.primary) || a.s.priority - b.s.priority);
  const pick = ordered[0];
  return pick ? pick.h.me || pick.s.phone : null;
}
