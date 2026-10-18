/**
 * The admin's WhatsApp inbox: `wa_messages` read as conversations, one per
 * number, and replies typed by staff (2026-10-16).
 *
 * WhatsApp lets a business send free text only inside the 24-hour window that
 * opens when the person messages it; outside it, only an approved template.
 * The window is checked here, on the server, before every send — the composer
 * greying out is a courtesy, not the rule.
 *
 * Server only.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { cloudConfig, graph, graphError } from "@/lib/waCloud";
import { recordOutbound } from "@/lib/waLog";

const WINDOW_HOURS = 24;

/** What each template actually said, so a thread shows the words the student saw. */
const TEMPLATE_TEXT: Record<string, (p: string[]) => string> = {
  ah_login_code: () =>
    "•••••• is your verification code. For your security, do not share this code.\nThis code expires in 10 minutes.",
  ah_finish_profile: ([name = "there"]) =>
    `Hi ${name}, your NEET college list on AdmissionHands is saved — only a few questions are left. Answer them to see every college on your list with your chance at each and an approximate fee. It takes about a minute.\n\n[Finish my profile]  [Expert Counsellor]`,
  ah_meet_counsellor: ([name = "there"]) =>
    `*Your NEET seat plan, made with an expert*\n\nHi ${name}, students with the same NEET rank often land a whole tier apart — it comes down to choice order, the round they freeze in and the quota they pick.\n\nGulshan Tomar, admission counsellor at AdmissionHands, builds that plan with you:\n✅ Which colleges to fill, and in what order\n✅ When to float, freeze or upgrade\n✅ Real fees, bond and hidden charges, confirmed with colleges\n\n[Expert Counsellor]  [See Gulshan's profile]`,
  ah_meet_counsellor_v2: ([name = "there"]) =>
    `*Your NEET seat plan, made with an expert*\n\nHi ${name}, students with the same NEET rank often land a whole tier apart — it comes down to choice order, the round they freeze in and the quota they pick.\n\nGulshan Tomar, admission counsellor at AdmissionHands, builds that plan with you:\n✅ Which colleges to fill, and in what order\n✅ When to float, freeze or upgrade\n✅ Real fees, bond and hidden charges, confirmed with colleges\n\n15+ years of NEET counselling · open daily, 10 AM – 10 PM.\n\nFor the latest counselling updates and info, join our Telegram channel: https://t.me/AdmissionHandsIndia\n\n[Expert Counsellor]  [See Gulshan's profile]`,
  ah_callback_request: ([name = "there"]) =>
    `Hi ${name}, we have received your request for NEET admission counselling on AdmissionHands.\n\nAn admission counsellor will call you on this number between 10 AM and 10 PM. Please keep your NEET rank, category and domicile state ready for the call.\n\n[Message your counsellor]`,
  hello_world: () => "Hello World — Welcome and congratulations!! (Meta's sample template)",
};

const TEMPLATE_LABEL: Record<string, string> = {
  ah_login_code: "Sign-in code",
  ah_finish_profile: "Finish-profile reminder",
  ah_meet_counsellor: "Meet the counsellor",
  ah_meet_counsellor_v2: "Meet the counsellor (with Telegram)",
  ah_callback_request: "Call-back confirmation",
  hello_world: "Test template",
};

export interface ChatMessage {
  id: number;
  direction: "out" | "in";
  kind: string;
  /** For a template: its label. Null for a typed message. */
  label: string | null;
  text: string;
  status: string;
  errorText: string | null;
  sentBy: string | null;
  at: string;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface Conversation {
  phone: string;
  name: string | null;
  leadId: number | null;
  leadStatus: string | null;
  level: string | null;
  rank: number | null;
  lastAt: string;
  lastText: string;
  lastDirection: "out" | "in";
  lastStatus: string;
  unread: number;
  failed: number;
  /** Free text can be sent until this moment; null when the window is closed. */
  windowUntil: string | null;
}

function render(row: { direction: string; template: string | null; body: string | null; kind: string }): {
  label: string | null;
  text: string;
} {
  if (row.direction === "in" || !row.template) return { label: null, text: row.body ?? "" };
  // The body of a logged template is "template · param · param".
  const params = (row.body ?? "").split(" · ").slice(1);
  const make = TEMPLATE_TEXT[row.template];
  return {
    label: TEMPLATE_LABEL[row.template] ?? row.template,
    text: make ? make(params) : row.body ?? row.template,
  };
}

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

export async function listConversations(opts: { q?: string; filter?: string } = {}): Promise<Conversation[]> {
  const digits = (opts.q ?? "").replace(/\D/g, "");
  const words = (opts.q ?? "").trim().toLowerCase();
  const rows = (await db.execute(sql`
    WITH last AS (
      SELECT DISTINCT ON (phone) phone, direction, template, body, kind, status, created_at
        FROM wa_messages ORDER BY phone, created_at DESC
    ),
    agg AS (
      SELECT phone,
             count(*) FILTER (WHERE direction = 'in' AND seen_at IS NULL)::int AS unread,
             count(*) FILTER (WHERE direction = 'out' AND status = 'failed')::int AS failed,
             max(created_at) FILTER (WHERE direction = 'in') AS last_in,
             max(name) FILTER (WHERE direction = 'in') AS wa_name
        FROM wa_messages GROUP BY phone
    )
    SELECT l.phone, l.direction, l.template, l.body, l.kind, l.status, l.created_at,
           a.unread, a.failed, a.last_in,
           COALESCE(u.name, ld.name, a.wa_name) AS name,
           ld.id AS lead_id, ld.lead_status, COALESCE(ld.level::text, u.level::text) AS level, COALESCE(ld.rank, u.rank) AS rank
      FROM last l
      JOIN agg a USING (phone)
      LEFT JOIN users u ON u.phone = l.phone
      LEFT JOIN LATERAL (
        SELECT id, name, lead_status, level, rank FROM leads
         WHERE right(regexp_replace(leads.phone, '\\D', '', 'g'), 10) = right(l.phone, 10)
         ORDER BY created_at DESC LIMIT 1
      ) ld ON TRUE
     ORDER BY (a.unread > 0) DESC, l.created_at DESC
     LIMIT 300
  `)) as unknown as Record<string, unknown>[];

  const now = Date.now();
  let list = rows.map((r): Conversation => {
    const { label, text } = render(r as never);
    const lastIn = r.last_in ? new Date(r.last_in as string).getTime() : 0;
    const until = lastIn ? lastIn + WINDOW_HOURS * 3600_000 : 0;
    return {
      phone: r.phone as string,
      name: (r.name as string) ?? null,
      leadId: (r.lead_id as number) ?? null,
      leadStatus: (r.lead_status as string) ?? null,
      level: (r.level as string) ?? null,
      rank: (r.rank as number) ?? null,
      lastAt: iso(r.created_at)!,
      lastText: label && r.direction === "out" ? label : text,
      lastDirection: r.direction as "out" | "in",
      lastStatus: r.status as string,
      unread: Number(r.unread ?? 0),
      failed: Number(r.failed ?? 0),
      windowUntil: until > now ? new Date(until).toISOString() : null,
    };
  });

  if (digits.length >= 3) list = list.filter((c) => c.phone.includes(digits));
  else if (words) list = list.filter((c) => (c.name ?? "").toLowerCase().includes(words));
  if (opts.filter === "unread") list = list.filter((c) => c.unread > 0);
  if (opts.filter === "failed") list = list.filter((c) => c.failed > 0);
  if (opts.filter === "replies") list = list.filter((c) => c.windowUntil !== null);
  return list;
}

export async function conversation(phone: string): Promise<ChatMessage[]> {
  const rows = (await db.execute(sql`
    SELECT id, direction, kind, template, body, status, error_code, error_title, error_detail, sent_by,
           created_at, delivered_at, read_at
      FROM wa_messages WHERE phone = ${phone}
     ORDER BY created_at ASC LIMIT 500
  `)) as unknown as Record<string, unknown>[];
  return rows.map((r) => {
    const { label, text } = render(r as never);
    const err = [r.error_code, r.error_title, r.error_detail].filter(Boolean).join(" — ");
    return {
      id: Number(r.id),
      direction: r.direction as "out" | "in",
      kind: r.kind as string,
      label,
      text,
      status: r.status as string,
      errorText: r.status === "failed" ? err || "Meta did not deliver this message." : null,
      sentBy: (r.sent_by as string) ?? null,
      at: iso(r.created_at)!,
      deliveredAt: iso(r.delivered_at),
      readAt: iso(r.read_at),
    };
  });
}

/** Opening a conversation is the moment its replies have been seen. */
export async function markSeen(phone: string) {
  await db.execute(sql`
    UPDATE wa_messages SET seen_at = now() WHERE phone = ${phone} AND direction = 'in' AND seen_at IS NULL
  `);
}

export async function unreadConversations(): Promise<number> {
  const [r] = (await db.execute(sql`
    SELECT count(DISTINCT phone)::int AS n FROM wa_messages WHERE direction = 'in' AND seen_at IS NULL
  `)) as unknown as { n: number }[];
  return r?.n ?? 0;
}

/**
 * Sends a typed reply — only inside the 24-hour window, which is checked here
 * against the student's own last message, whatever the screen thought.
 */
export async function sendReply(phone: string, text: string, sentBy: string) {
  const body = text.trim().slice(0, 4000);
  if (!body) return { ok: false as const, error: "Type a message first." };

  const [last] = (await db.execute(sql`
    SELECT max(created_at) AS t FROM wa_messages WHERE phone = ${phone} AND direction = 'in'
  `)) as unknown as { t: string | null }[];
  if (!last?.t || Date.now() - new Date(last.t).getTime() > WINDOW_HOURS * 3600_000) {
    return {
      ok: false as const,
      error: "WhatsApp only allows a typed reply within 24 hours of the student's last message. Call them, or wait for them to write.",
    };
  }

  const c = await cloudConfig();
  if (!c?.phoneNumberId) return { ok: false as const, error: "The official WhatsApp sender is not set up." };
  const r = await graph(c.token, `/${c.phoneNumberId}/messages`, {
    method: "POST",
    body: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone.replace(/\D/g, ""),
      type: "text",
      text: { body, preview_url: true },
    },
  });
  const id = r.ok ? ((r.body.messages as { id?: string }[] | undefined) ?? [])[0]?.id ?? null : null;
  await recordOutbound({ wamid: id, phone, kind: "agent", body, sentBy, error: r.ok ? null : graphError(r) });
  return r.ok ? { ok: true as const } : { ok: false as const, error: graphError(r) };
}
