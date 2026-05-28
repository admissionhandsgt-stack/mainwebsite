import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppNotification } from '@/lib/whatsappService';

// Force dynamic rendering so env vars are available at runtime, not build time
export const dynamic = 'force-dynamic';

// Lazy-initialize Supabase client to avoid build-time failure when env vars are missing
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables are not configured');
  }
  return createClient(url, key);
}

// Simple in-memory rate limiting (Note: In a multi-region deployment, consider Redis/KV)
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();

    // 1. Setup Timeout (AbortController)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    // 2. Rate Limiting Check
    const now = Date.now();
    const ipRateLimit = rateLimitCache.get(ip);
    
    if (ipRateLimit) {
      if (now < ipRateLimit.resetTime) {
        if (ipRateLimit.count >= RATE_LIMIT_MAX) {
          clearTimeout(timeoutId);
          return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }
        ipRateLimit.count += 1;
      } else {
        rateLimitCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      }
    } else {
      rateLimitCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }

    // 3. Parse Request
    const body = await req.json();
    const { 
      name, 
      phone, 
      rank, 
      preferred_branch, 
      preferred_state, 
      quota_interest, 
      internship_status, 
      source = 'PG Page', 
      honeypot 
    } = body;

    // 4. Bot Protection (Honeypot)
    if (honeypot) {
      clearTimeout(timeoutId);
      console.warn(`[Security] Bot detected via honeypot from IP: ${ip}`);
      return NextResponse.json({ success: true, message: 'Lead captured successfully' });
    }

    // 5. Validation & Sanitization
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      clearTimeout(timeoutId);
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!phone || typeof phone !== 'string') {
      clearTimeout(timeoutId);
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Normalize phone number (very basic: remove non-digits)
    const normalizedPhone = phone.replace(/\D/g, '');
    
    if (normalizedPhone.length < 10) {
      clearTimeout(timeoutId);
      return NextResponse.json({ error: 'Invalid phone number. Minimum 10 digits required.' }, { status: 400 });
    }

    // Format phone number
    const finalPhone = normalizedPhone.length === 10 ? `+91${normalizedPhone}` : `+${normalizedPhone}`;

    // 6. Duplicate Check (Last 5 minutes)
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    let isDuplicate = false;

    // Check pg_leads first, fall back to leads if table doesn't exist
    try {
      const { data: pgDup, error: pgDupErr } = await (supabase
        .from('pg_leads') as any)
        .select('id')
        .eq('phone', finalPhone)
        .gte('created_at', fiveMinsAgo)
        .limit(1);

      if (!pgDupErr && pgDup && pgDup.length > 0) {
        isDuplicate = true;
      }
    } catch {
      // Fallback check on generic leads table
      try {
        const { data: standardDup } = await (supabase
          .from('leads') as any)
          .select('id')
          .eq('phone', finalPhone)
          .gte('created_at', fiveMinsAgo)
          .limit(1);

        if (standardDup && standardDup.length > 0) {
          isDuplicate = true;
        }
      } catch {
        // Safe skip if neither is accessible
      }
    }

    if (isDuplicate) {
      clearTimeout(timeoutId);
      return NextResponse.json({ error: 'A request with this phone number was recently submitted.' }, { status: 429 });
    }

    let insertSuccess = false;

    // 7. Attempt Insert into pg_leads
    try {
      const { error: insertPgError } = await (supabase
        .from('pg_leads') as any)
        .insert([
          {
            name: name.trim(),
            phone: finalPhone,
            rank: rank ? parseInt(String(rank).replace(/,/g, ''), 10) : null,
            preferred_branch: preferred_branch || null,
            preferred_state: preferred_state || null,
            quota_interest: quota_interest || null,
            internship_status: internship_status || null,
            source_page: String(source).trim(),
            lead_status: 'New'
          }
        ]);

      if (!insertPgError) {
        insertSuccess = true;
      } else {
        console.warn('[Database] Insertion to pg_leads failed. Falling back to leads table. Error:', insertPgError.message);
      }
    } catch (err: any) {
      console.warn('[Database] Exception writing to pg_leads table. Falling back to leads table. Error:', err.message);
    }

    // 8. Fallback to generic leads table
    if (!insertSuccess) {
      const fallbackSource = `${String(source).trim()} (PG Fallback: Branch=${preferred_branch || 'None'}, State=${preferred_state || 'None'}, Quota=${quota_interest || 'None'}, Internship=${internship_status || 'None'})`;
      const { error: insertStandardError } = await (supabase
        .from('leads') as any)
        .insert([
          {
            name: name.trim(),
            phone: finalPhone,
            rank: rank ? String(rank).trim() : null,
            source: fallbackSource
          }
        ]);

      if (insertStandardError) {
        console.error('[Database] Fallback leads insertion failed:', insertStandardError.message);
        clearTimeout(timeoutId);
        return NextResponse.json({ error: 'Failed to capture lead. Please try again.' }, { status: 500 });
      }
      insertSuccess = true;
    }

    clearTimeout(timeoutId);

    // 9. Asynchronously dispatch WhatsApp Alert to counselor (Non-blocking)
    const formattedRank = rank ? String(rank).replace(/,/g, '') : undefined;
    sendWhatsAppNotification({
      name: name.trim(),
      phone: finalPhone,
      rank: formattedRank,
      preferred_branch: preferred_branch,
      preferred_state: preferred_state,
      quota_interest: quota_interest,
      internship_status: internship_status,
      source: source
    }).catch(err => console.error('[WhatsApp Notification Engine] Error sending alert:', err));

    return NextResponse.json({ success: true, message: 'Lead captured successfully' });

  } catch (error: any) {
    console.error('[API] Server error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
