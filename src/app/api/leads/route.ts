import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const userAgent = req.headers.get('user-agent') || 'unknown';

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
    const { name, phone, rank, source = 'PG Page', honeypot } = body;

    // 4. Bot Protection (Honeypot)
    if (honeypot) {
      // If honeypot is filled, it's likely a bot. Pretend it was successful.
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
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Optionally format to +91 if Indian number is expected, but keeping digits is safer for DB storage.
    const finalPhone = normalizedPhone.length === 10 ? `+91${normalizedPhone}` : `+${normalizedPhone}`;

    // 6. Duplicate Check (Last 5 minutes)
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingLeads, error: checkError } = await (supabase
      .from('leads') as any)
      .select('id')
      .eq('phone', finalPhone)
      .gte('created_at', fiveMinsAgo)
      .limit(1);

    if (checkError) {
      console.error('[Database] Error checking duplicates:', checkError);
      // We log but continue, might be RLS preventing read, which is fine if insert only.
      // Actually, if RLS prevents read for anon, this check might fail. 
      // A robust duplicate check requires a backend service key or a specific RPC function.
      // For now, we assume if it fails, we just proceed to insert.
    } else if (existingLeads && existingLeads.length > 0) {
      clearTimeout(timeoutId);
      return NextResponse.json({ error: 'A request with this phone number was recently submitted.' }, { status: 429 });
    }

    // 7. Insert Lead
    const { error: insertError } = await (supabase
      .from('leads') as any)
      .insert([
        {
          name: name.trim(),
          phone: finalPhone,
          rank: rank ? String(rank).trim() : null,
          source: String(source).trim()
        }
      ]);

    clearTimeout(timeoutId);

    if (insertError) {
      console.error('[Database] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to capture lead. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Lead captured successfully' });

  } catch (error: any) {
    console.error('[API] Server error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
