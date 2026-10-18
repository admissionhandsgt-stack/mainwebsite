/**
 * The official WhatsApp number's message log (`wa_messages`, migration 0031).
 *
 * The send call only ever answers "accepted". Whether the message reached the
 * phone, was read, or failed — and Meta's reason — arrives afterwards on the
 * webhook (`/api/whatsapp/cloud`) and is written onto the same row by message
 * id. Admin → WhatsApp Inbox reads it (lib/waInbox.ts).
 *
 * Server only. A sign-in code's digits never reach this table.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";

export type MessageKind = "otp" | "followup" | "callback" | "reply" | "agent" | "other";

/**
 * What Meta's "Verify token" box holds for /api/whatsapp/cloud. Deliberately
 * not a secret: it only answers Meta's one-time handshake, and the route's own
 * checks (known message ids, our phone number id, the app signature) are what
 * keep the log honest.
 */
export const VERIFY_TOKEN = "admissionhands-whatsapp-webhook";

const plus = (digits: string) => (digits.startsWith("+") ? digits : `+${digits.replace(/\D/g, "")}`);

/** Written right after the send call, whatever Meta answered. Never throws. */
export async function recordOutbound(input: {
  wamid: string | null;
  phone: string;
  kind: MessageKind;
  template?: string | null;
  body: string;
  otpId?: number | null;
  error?: string | null;
  /** The admin who typed it, for a reply sent from the inbox. */
  sentBy?: string | null;
}) {
  try {
    await db.execute(sql`
      INSERT INTO wa_messages (direction, wamid, phone, kind, template, body, status, error_detail, otp_id, failed_at, sent_by)
      VALUES ('out', ${input.wamid}, ${plus(input.phone)}, ${input.kind}, ${input.template ?? null}, ${input.body},
              ${input.error ? "failed" : "accepted"}, ${input.error ?? null}, ${input.otpId ?? null},
              ${input.error ? sql`now()` : sql`NULL`}, ${input.sentBy ?? null})
      ON CONFLICT (wamid) DO NOTHING
    `);
  } catch (error) {
    logError(error, { route: "waLog.recordOutbound" });
  }
}

/** Meta's statuses only move forward, but they can arrive out of order. */
const RANK: Record<string, number> = { accepted: 0, sent: 1, delivered: 2, read: 3 };

interface MetaStatus {
  id: string;
  status: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[];
  pricing?: { billable?: boolean; category?: string };
}

interface MetaInbound {
  id: string;
  from: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  image?: { id?: string; caption?: string };
  video?: { id?: string; caption?: string };
  document?: { id?: string; caption?: string; filename?: string };
  audio?: { id?: string };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
  contacts?: { name?: { formatted_name?: string } }[];
}

const at = (ts?: string) => (ts && /^\d+$/.test(ts) ? new Date(Number(ts) * 1000).toISOString() : new Date().toISOString());

export async function applyStatus(s: MetaStatus) {
  if (!s?.id || !s.status) return;
  const when = at(s.timestamp);
  const e = s.errors?.[0];
  const rank = RANK[s.status] ?? -1;
  // Only ever a message we logged: the webhook is public, and an id we have
  // never seen is either not ours or somebody guessing — so it is dropped.
  await db.execute(sql`
    UPDATE wa_messages SET
      status = CASE
        WHEN ${s.status} = 'failed' THEN 'failed'
        WHEN status = 'failed' THEN status
        WHEN ${rank} > COALESCE(array_position(ARRAY['accepted','sent','delivered','read'], status) - 1, -1) THEN ${s.status}
        ELSE status END,
      sent_at      = CASE WHEN ${s.status} = 'sent'      THEN COALESCE(sent_at, ${when}::timestamptz)      ELSE sent_at END,
      delivered_at = CASE WHEN ${s.status} = 'delivered' THEN COALESCE(delivered_at, ${when}::timestamptz) ELSE delivered_at END,
      read_at      = CASE WHEN ${s.status} = 'read'      THEN COALESCE(read_at, ${when}::timestamptz)      ELSE read_at END,
      failed_at    = CASE WHEN ${s.status} = 'failed'    THEN COALESCE(failed_at, ${when}::timestamptz)    ELSE failed_at END,
      error_code   = COALESCE(${e?.code ?? null}::integer, error_code),
      error_title  = COALESCE(${e?.title ?? e?.message ?? null}, error_title),
      error_detail = COALESCE(${e?.error_data?.details ?? null}, error_detail),
      billable         = COALESCE(${s.pricing?.billable ?? null}::boolean, billable),
      pricing_category = COALESCE(${s.pricing?.category ?? null}, pricing_category),
      updated_at = now()
    WHERE wamid = ${s.id}
  `);
}

export async function recordInbound(m: MetaInbound, name: string | null) {
  if (!m?.id || !m.from) return;
  // A photo or a file keeps its caption, file name and Meta's media id, so the
  // record says what was sent even though the file itself is not stored here.
  const media = (label: string, x?: { id?: string; caption?: string; filename?: string }) =>
    `[${label}${x?.filename ? `: ${x.filename}` : ""}]${x?.caption ? ` ${x.caption}` : ""}${x?.id ? ` (media ${x.id})` : ""}`;
  const body =
    m.text?.body ??
    m.button?.text ??
    m.interactive?.button_reply?.title ??
    m.interactive?.list_reply?.title ??
    (m.image ? media("photo", m.image) : undefined) ??
    (m.video ? media("video", m.video) : undefined) ??
    (m.document ? media("document", m.document) : undefined) ??
    (m.audio ? media("voice note", m.audio) : undefined) ??
    (m.location ? `[location] ${[m.location.name, m.location.address].filter(Boolean).join(", ")} (${m.location.latitude}, ${m.location.longitude})` : undefined) ??
    (m.contacts?.length ? `[contact] ${m.contacts.map((c) => c.name?.formatted_name).filter(Boolean).join(", ")}` : undefined) ??
    `[${m.type ?? "message"}]`;
  await db.execute(sql`
    INSERT INTO wa_messages (direction, wamid, phone, name, kind, body, status, created_at)
    VALUES ('in', ${m.id}, ${plus(m.from)}, ${name}, 'reply', ${body.slice(0, 2000)}, 'received', ${at(m.timestamp)})
    ON CONFLICT (wamid) DO NOTHING
  `);
}

/* --------------------------------------------------------------- admin reads */

/** The last 24 hours, for the cards at the top of the screen. */
export async function messageSummary() {
  const [r] = (await db.execute(sql`
    SELECT count(*) FILTER (WHERE direction = 'out')::int AS sent,
           count(*) FILTER (WHERE direction = 'out' AND status IN ('delivered','read'))::int AS delivered,
           count(*) FILTER (WHERE direction = 'out' AND status = 'read')::int AS read,
           count(*) FILTER (WHERE direction = 'out' AND status = 'failed')::int AS failed,
           count(*) FILTER (WHERE direction = 'out' AND status = 'accepted' AND created_at < now() - interval '10 minutes')::int AS waiting,
           count(*) FILTER (WHERE direction = 'in')::int AS replies
      FROM wa_messages WHERE created_at > now() - interval '24 hours'
  `)) as unknown as Record<string, number>[];
  return r ?? { sent: 0, delivered: 0, read: 0, failed: 0, waiting: 0, replies: 0 };
}

/** Whether Meta's webhook has delivered anything yet — the setup box hides once it has. */
export async function receiptsArriving(): Promise<boolean> {
  const [r] = (await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM wa_messages
       WHERE sent_at IS NOT NULL OR delivered_at IS NOT NULL OR read_at IS NOT NULL
          OR direction = 'in' OR (status = 'failed' AND error_code IS NOT NULL)
    ) AS yes
  `)) as unknown as { yes: boolean }[];
  return Boolean(r?.yes);
}
