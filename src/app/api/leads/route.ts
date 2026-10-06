import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { sendWhatsAppNotification } from '@/lib/whatsappService';
import { clientIp } from "@/lib/clientIp";
import { checkPhone } from "@/lib/phone";
import { checkName, checkEmail, tidy } from "@/lib/formRules";
import { checkRank } from "@/lib/neetLimits";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Public lead capture.
 *
 * UG and PG enquiries land in the same `leads` table, separated by `level` —
 * the two Supabase tables (`leads` and `pg_leads`) were consolidated during
 * the migration, so the old write-to-pg_leads-then-fall-back-to-leads dance
 * is gone. Every field the forms collect now has a real column.
 */

// Per-isolate, so this is a courtesy limit rather than a distributed one.
// It still stops a single browser hammering the endpoint.
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitCache.get(ip);
  if (!entry || now >= entry.resetTime) {
    rateLimitCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// Free text from the form, tidied and capped: every value here is read by a
// counsellor, and nothing had a length limit before 2026-10-06.
const textOrNull = (v: unknown, max = 120): string | null => tidy(v, max) || null;

export async function POST(req: Request) {
  try {
    const ip = clientIp(req) ?? 'unknown';
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const {
      name,
      phone,
      email,
      rank,
      preferred_branch,
      preferred_state,
      quota_interest,
      internship_status,
      category,
      message,
      level,
      source = 'PG Page',
      honeypot,
    } = body;

    // Bot protection: answer as if it worked so the bot has nothing to learn.
    if (honeypot) {
      console.warn(`[Security] Bot detected via honeypot from IP: ${ip}`);
      return NextResponse.json({ success: true, message: 'Lead captured successfully' });
    }

    // The same rules the forms show as you type (lib/phone, formRules,
    // neetLimits). Each refusal says what to fix, because the form shows it.
    const checkedName = checkName(name);
    if (!checkedName.ok) return NextResponse.json({ error: checkedName.error }, { status: 400 });

    // Indian mobile — or, written with its own +country code, a foreign one:
    // NRI families enquire from abroad. Before this, any 10+ digits passed and
    // `1234567890` reached the counsellors as +911234567890.
    const checkedPhone = checkPhone(phone, { allowInternational: true });
    if (!checkedPhone.ok) return NextResponse.json({ error: checkedPhone.error }, { status: 400 });
    const finalPhone = checkedPhone.e164;

    const checkedEmail = checkEmail(email);
    if (!checkedEmail.ok) return NextResponse.json({ error: checkedEmail.error }, { status: 400 });

    const sourcePage = tidy(source, 200) || 'PG Page';
    // A PG enquiry unless the form says otherwise: every current form that
    // posts here without a level is on the PG side of the site.
    const leadLevel = level === 'ug' || level === 'pg' ? level : 'pg';

    // Optional, but if it is given it has to be a rank somebody could hold.
    let finalRank: number | null = null;
    if (rank !== undefined && rank !== null && String(rank).trim() !== '') {
      const checkedRank = checkRank(rank, leadLevel);
      if (!checkedRank.ok) return NextResponse.json({ error: checkedRank.error }, { status: 400 });
      finalRank = checkedRank.value;
    }

    // A double-submitted form is the common case here, not a second genuine
    // enquiry, so the same number inside five minutes is rejected.
    const dup = (await db.execute(sql`
      SELECT id FROM leads
      WHERE phone = ${finalPhone} AND created_at >= now() - interval '5 minutes'
      LIMIT 1
    `)) as unknown as unknown[];

    if (dup.length > 0) {
      return NextResponse.json(
        { error: 'A request with this phone number was recently submitted.' },
        { status: 429 },
      );
    }

    await db.execute(sql`
      INSERT INTO leads
        (level, name, phone, email, rank, preferred_branch, preferred_state,
         quota_interest, internship_status, category, message, source_page, lead_status)
      VALUES
        (${leadLevel}::level, ${checkedName.value}, ${finalPhone}, ${checkedEmail.value || null}, ${finalRank},
         ${textOrNull(preferred_branch)}, ${textOrNull(preferred_state)},
         ${textOrNull(quota_interest)}, ${textOrNull(internship_status)},
         ${textOrNull(category, 48)}, ${textOrNull(message, 2000)}, ${sourcePage}, 'New')
    `);

    // Fire and forget: a WhatsApp outage must not cost us the lead.
    sendWhatsAppNotification({
      name: checkedName.value,
      phone: finalPhone,
      rank: finalRank != null ? String(finalRank) : undefined,
      preferred_branch: textOrNull(preferred_branch) ?? undefined,
      preferred_state: textOrNull(preferred_state) ?? undefined,
      quota_interest: textOrNull(quota_interest) ?? undefined,
      internship_status: textOrNull(internship_status) ?? undefined,
      source: sourcePage,
    }).catch((err) =>
      console.error('[WhatsApp Notification Engine] Error sending alert:', err),
    );

    return NextResponse.json({ success: true, message: 'Lead captured successfully' });
  } catch (error) {
    console.error('[/api/leads]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
