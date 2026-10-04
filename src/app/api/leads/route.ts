import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { sendWhatsAppNotification } from '@/lib/whatsappService';
import { clientIp } from "@/lib/clientIp";

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

const trimOrNull = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
};

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

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number. Minimum 10 digits required.' },
        { status: 400 },
      );
    }
    const finalPhone =
      normalizedPhone.length === 10 ? `+91${normalizedPhone}` : `+${normalizedPhone}`;

    const sourcePage = String(source).trim();
    // A PG enquiry unless the form says otherwise: every current form that
    // posts here without a level is on the PG side of the site.
    const leadLevel = level === 'ug' || level === 'pg' ? level : 'pg';

    const parsedRank = rank ? parseInt(String(rank).replace(/[^\d]/g, ''), 10) : NaN;
    const finalRank = Number.isFinite(parsedRank) ? parsedRank : null;

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
        (${leadLevel}::level, ${name.trim()}, ${finalPhone}, ${trimOrNull(email)}, ${finalRank},
         ${trimOrNull(preferred_branch)}, ${trimOrNull(preferred_state)},
         ${trimOrNull(quota_interest)}, ${trimOrNull(internship_status)},
         ${trimOrNull(category)}, ${trimOrNull(message)}, ${sourcePage}, 'New')
    `);

    // Fire and forget: a WhatsApp outage must not cost us the lead.
    sendWhatsAppNotification({
      name: name.trim(),
      phone: finalPhone,
      rank: finalRank != null ? String(finalRank) : undefined,
      preferred_branch,
      preferred_state,
      quota_interest,
      internship_status,
      source,
    }).catch((err) =>
      console.error('[WhatsApp Notification Engine] Error sending alert:', err),
    );

    return NextResponse.json({ success: true, message: 'Lead captured successfully' });
  } catch (error) {
    console.error('[/api/leads]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
