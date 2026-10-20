/**
 * WhatsApp follow-ups to students who signed in and stopped (2026-10-13).
 *
 * Two approved templates, sent from the official number, each at most once per
 * student, ever (`wa_followups`, unique on user and template):
 *
 *   ah_finish_profile   1 h – 7 d after sign-in, profile still missing an essential
 *   ah_meet_counsellor  3 h – 14 d after sign-in, and nobody on the team has spoken to them yet
 *
 * Sent only 10 AM – 9 PM IST, at most MAX_PER_RUN a run, and only while
 * `whatsapp.followups.enabled` is on. `run({ dry: true })` lists who would get
 * what without sending anything.
 *
 * One retry, for one reason (2026-10-20): Meta accepts a marketing template and
 * then holds it back with error 131049 ("to maintain healthy ecosystem
 * engagement") when the student has had too many business messages lately — 12
 * of the first 46 follow-ups. The student never saw it, so once a day has passed
 * the slot is offered again, still inside its window and still only if the
 * reason for it stands. Meta's advice for 131049 is to retry later, not at once.
 * A retry is recorded as 'resent' and is never retried again; any other failure
 * is final.
 *
 * Server only.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { getIntegrationFlag } from "@/lib/integrations";
import { cloudConfig, cloudReady, graph, sendTemplate } from "@/lib/waCloud";
import { logError } from "@/lib/logger";

export const FOLLOWUPS = {
  finish: "ah_finish_profile",
  counsellor: "ah_meet_counsellor",
} as const;

/**
 * The counsellor introduction with a line inviting the student to the Telegram
 * channel (2026-10-17, owner's request — the sign-in code cannot carry it, Meta
 * fixes an authentication template's text). Sent in place of ah_meet_counsellor
 * once Meta approves it, and until then the first version goes. wa_followups
 * still records the slot as "ah_meet_counsellor", so a student who had the first
 * version never gets the second: one introduction per student, ever.
 */
export const COUNSELLOR_V2 = "ah_meet_counsellor_v2";

const MAX_PER_RUN = 50;

/**
 * New students only (owner's call, 2026-10-13): nobody who signed in before the
 * follow-ups were switched on is messaged, however incomplete their profile.
 */
const SINCE = "2026-10-13T17:06:00Z";

function inSendingHours(now = new Date()): boolean {
  const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60_000);
  const h = ist.getHours();
  return h >= 10 && h < 21;
}

const firstName = (name: string | null) => {
  const n = (name ?? "").trim().split(/\s+/)[0];
  return n && n.length <= 30 ? n : "there";
};

interface Candidate {
  userId: number;
  phone: string;
  name: string | null;
  template: string;
}

/**
 * True when this student's slot is still open: never sent, or sent once and held
 * back by Meta with 131049 more than a day ago (see the header).
 */
const slotOpen = (slot: string) => sql`
  NOT EXISTS (
    SELECT 1 FROM wa_followups f
     WHERE f.user_id = u.id AND f.template = ${slot}
       AND NOT (f.status = 'sent' AND EXISTS (
         SELECT 1 FROM wa_messages m
          WHERE m.wamid = f.message_id AND m.status = 'failed' AND m.error_code = 131049
            AND m.failed_at < now() - interval '24 hours')))`;

async function candidates(): Promise<Candidate[]> {
  const finish = (await db.execute(sql`
    SELECT u.id AS user_id, u.phone, u.name
      FROM users u
     WHERE u.verified_at IS NOT NULL
       AND u.created_at BETWEEN now() - interval '7 days' AND now() - interval '1 hour'
       AND u.created_at >= ${SINCE}::timestamptz
       AND (u.stream IS NULL OR u.gender IS NULL OR u.domicile_state IS NULL OR u.budget_max IS NULL)
       AND ${slotOpen(FOLLOWUPS.finish)}
     ORDER BY u.created_at
     LIMIT ${MAX_PER_RUN}
  `)) as unknown as { user_id: number; phone: string; name: string | null }[];

  const counsellor = (await db.execute(sql`
    SELECT u.id AS user_id, u.phone, u.name
      FROM users u
     WHERE u.verified_at IS NOT NULL
       AND u.created_at BETWEEN now() - interval '14 days' AND now() - interval '3 hours'
       AND u.created_at >= ${SINCE}::timestamptz
       AND ${slotOpen(FOLLOWUPS.counsellor)}
       -- Not if the team has already spoken to them: a lead from this number
       -- that has moved on from "new" or has a contact logged.
       AND NOT EXISTS (
         SELECT 1 FROM leads l
          WHERE right(regexp_replace(l.phone, '\\D', '', 'g'), 10) = right(regexp_replace(u.phone, '\\D', '', 'g'), 10)
            AND (lower(l.lead_status) <> 'new' OR l.last_contacted_at IS NOT NULL)
       )
     ORDER BY u.created_at
     LIMIT ${MAX_PER_RUN}
  `)) as unknown as { user_id: number; phone: string; name: string | null }[];

  // One message per student per run: the profile nudge first, the counsellor
  // introduction on a later run.
  const seen = new Set<number>();
  const out: Candidate[] = [];
  for (const r of finish) {
    seen.add(r.user_id);
    out.push({ userId: r.user_id, phone: r.phone, name: r.name, template: FOLLOWUPS.finish });
  }
  for (const r of counsellor) {
    if (seen.has(r.user_id)) continue;
    out.push({ userId: r.user_id, phone: r.phone, name: r.name, template: FOLLOWUPS.counsellor });
  }
  return out.slice(0, MAX_PER_RUN);
}

/**
 * The confirmation a student gets the moment they ask for a counsellor — a
 * UTILITY template, because it answers a request they just made. Deliberately
 * not part of FOLLOWUPS: it is never sent by the cron, only in reply.
 */
export const CALLBACK_TEMPLATE = "ah_callback_request";

/** Which templates Meta has approved. A send before approval fails and would use up the student's one message. */
async function approvedTemplates(names: string[] = [...Object.values(FOLLOWUPS), COUNSELLOR_V2]): Promise<Set<string>> {
  const c = await cloudConfig();
  const out = new Set<string>();
  if (!c?.wabaId) return out;
  for (const name of names) {
    const r = await graph(c.token, `/${c.wabaId}/message_templates?name=${name}&fields=name,status`);
    const rows = (r.ok ? (r.body.data as { name?: string; status?: string }[]) : []) ?? [];
    if (rows.some((t) => t.name === name && t.status === "APPROVED")) out.add(name);
  }
  return out;
}

/** Approval is read from Meta at most every ten minutes — this runs on a student's click. */
let callbackApproved: { at: number; ok: boolean } | null = null;

/**
 * "We have your request" to a verified student who just asked for a counsellor.
 * Once per student, ever (`wa_followups`), so pressing the button twice is one
 * message. Fails quietly: the request is already recorded and alerted.
 */
export async function sendCallbackConfirmation(user: { id: number; phone: string; name: string | null; verified: boolean }) {
  if (!user.verified || !(await cloudReady())) return;
  if (!callbackApproved || Date.now() - callbackApproved.at > 10 * 60_000) {
    callbackApproved = { at: Date.now(), ok: (await approvedTemplates([CALLBACK_TEMPLATE])).has(CALLBACK_TEMPLATE) };
  }
  if (!callbackApproved.ok) return;

  const claimed = (await db.execute(sql`
    INSERT INTO wa_followups (user_id, template, status) VALUES (${user.id}, ${CALLBACK_TEMPLATE}, 'sending')
    ON CONFLICT (user_id, template) DO NOTHING RETURNING id
  `)) as unknown as { id: number }[];
  if (!claimed.length) return;
  const r = await sendTemplate(user.phone, CALLBACK_TEMPLATE, [firstName(user.name)], "callback");
  if (r.ok) {
    await db.execute(sql`UPDATE wa_followups SET status = 'sent', message_id = ${r.id} WHERE id = ${claimed[0].id}`);
  } else {
    await db.execute(sql`UPDATE wa_followups SET status = 'failed', error = ${r.error.slice(0, 300)} WHERE id = ${claimed[0].id}`);
    logError(new Error(`callback confirmation failed: ${r.error}`), { route: "followups" });
  }
}

export interface FollowupReport {
  dry: boolean;
  enabled: boolean;
  inHours: boolean;
  due: { userId: number; phone: string; name: string; template: string }[];
  approved: string[];
  sent: number;
  failed: number;
}

export async function runFollowups({ dry }: { dry: boolean }): Promise<FollowupReport> {
  const [enabled, ready] = await Promise.all([getIntegrationFlag("whatsapp.followups.enabled"), cloudReady()]);
  const inHours = inSendingHours();
  const [all, approved] = await Promise.all([candidates(), approvedTemplates()]);
  // The slot is recorded under its first name; what goes out is the newest approved version.
  const sendAs = (slot: string) => (slot === FOLLOWUPS.counsellor && approved.has(COUNSELLOR_V2) ? COUNSELLOR_V2 : slot);
  const due = all.filter((d) => approved.has(sendAs(d.template)));
  const report: FollowupReport = {
    dry,
    enabled: enabled && ready,
    inHours,
    // Last four digits only — this goes back over HTTP.
    due: due.map((d) => ({ userId: d.userId, phone: `••••${d.phone.slice(-4)}`, name: firstName(d.name), template: sendAs(d.template) })),
    approved: [...approved],
    sent: 0,
    failed: 0,
  };
  if (dry || !enabled || !ready || !inHours) return report;

  for (const d of due) {
    // Claim the row first, so a second run in parallel cannot send it again. A slot
    // that exists already is the one retry: claimed only from 'sent', and only while
    // Meta's 131049 hold on that message stands.
    let claimed = (await db.execute(sql`
      INSERT INTO wa_followups (user_id, template, status) VALUES (${d.userId}, ${d.template}, 'sending')
      ON CONFLICT (user_id, template) DO NOTHING RETURNING id
    `)) as unknown as { id: number }[];
    let retry = false;
    if (!claimed.length) {
      claimed = (await db.execute(sql`
        UPDATE wa_followups f SET status = 'resending'
         WHERE f.user_id = ${d.userId} AND f.template = ${d.template} AND f.status = 'sent'
           AND EXISTS (SELECT 1 FROM wa_messages m
                        WHERE m.wamid = f.message_id AND m.status = 'failed' AND m.error_code = 131049
                          AND m.failed_at < now() - interval '24 hours')
        RETURNING f.id
      `)) as unknown as { id: number }[];
      retry = true;
    }
    if (!claimed.length) continue;
    const r = await sendTemplate(d.phone, sendAs(d.template), [firstName(d.name)], "followup");
    if (r.ok) {
      report.sent++;
      await db.execute(
        sql`UPDATE wa_followups SET status = ${retry ? "resent" : "sent"}, message_id = ${r.id} WHERE id = ${claimed[0].id}`,
      );
    } else {
      report.failed++;
      await db.execute(sql`UPDATE wa_followups SET status = 'failed', error = ${r.error.slice(0, 300)} WHERE id = ${claimed[0].id}`);
      logError(new Error(`follow-up ${d.template} failed: ${r.error}`), { route: "followups" });
    }
  }
  return report;
}
