/**
 * Recording the enquiry behind a sign-up.
 *
 * Every way in creates the same lead, and the team's dashboard should not be
 * able to tell them apart by accident. Written once here so they cannot drift
 * into recording different things about the same person.
 *
 * `/api/unlock` used to be one of them. It was removed on 2026-11-05: it gave
 * anybody who typed a phone number a signed-in session for that number's
 * account, documents included. A session is minted only after proof — a code
 * (`/api/auth/verify`), an inbound WhatsApp (`/api/verify/status`) or the
 * password (`/api/auth/login`). Never add a fourth way that skips the proof.
 *
 * Deliberately never throws: a failure to alert or to log the lead must not
 * cost the visitor the access they just proved they were entitled to.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { sendWhatsAppNotification } from "@/lib/whatsappService";
import { logError } from "@/lib/logger";

export interface LeadInput {
  name: string;
  phone: string;
  level: "ug" | "pg";
  rank: number | null;
  category: string | null;
  /** Where they were standing, for the admin's "source" column. */
  source?: string | null;
  /** True when the number was proved by a code rather than only typed. */
  verified?: boolean;
}

/**
 * Returns whether this was a new lead.
 *
 * Someone reopening the tool next week is the same person, not a second
 * enquiry, so a 24-hour window deduplicates — but the caller still gets their
 * session either way, because losing a cookie must not cost access.
 */
export async function recordLead(input: LeadInput): Promise<{ isNew: boolean }> {
  try {
    const existing = (await db.execute(sql`
      SELECT id FROM leads
       WHERE phone = ${input.phone} AND created_at >= now() - interval '24 hours'
       LIMIT 1
    `)) as unknown as unknown[];

    if (existing.length) return { isNew: false };

    const source = input.source || `Seat predictor — ${input.level.toUpperCase()}`;
    const how = input.verified ? "Verified their number and unlocked" : "Unlocked";
    const message = input.rank
      ? `${how} the seat list at rank ${input.rank}${input.category ? ` (${input.category})` : ""}.`
      : `${how} the seat list.`;

    await db.execute(sql`
      INSERT INTO leads
        (level, name, phone, rank, category, source_page, lead_status, message)
      VALUES
        (${input.level}::level, ${input.name}, ${input.phone}, ${input.rank},
         ${input.category}, ${source}, 'New', ${message})
    `);

    // Fire and forget: an alerting outage must not block the sign-in.
    sendWhatsAppNotification({
      name: input.name,
      phone: input.phone,
      rank: input.rank ?? undefined,
      source,
    }).catch((err) => console.error("[leadCapture] WhatsApp alert failed:", err));

    return { isNew: true };
  } catch (error) {
    logError(error, { route: "leadCapture" });
    return { isNew: false };
  }
}
