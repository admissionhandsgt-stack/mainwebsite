import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getIntegration } from "@/lib/integrations";
import { applyStatus, recordInbound, VERIFY_TOKEN } from "@/lib/waLog";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Meta's webhook for the official number (2026-10-16): delivery receipts and
 * replies, written into `wa_messages` for Admin → WhatsApp Messages.
 *
 * The endpoint is public and its URL and verify token sit in Meta's App
 * Dashboard, so neither is treated as a secret. What keeps strangers from
 * writing into the log is the payload itself:
 *
 *   - a status only ever updates a message we logged, by Meta's message id —
 *     an id nobody outside Meta and us has seen (waLog.applyStatus);
 *   - a reply is only recorded when it names our own phone number id;
 *   - once the app secret is saved, Meta's X-Hub-Signature-256 is required too.
 *
 * Always 200 on a POST that passed those checks, even when a row fails to
 * write: Meta retries anything else for days and then switches the webhook off.
 */

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Meta's one-time check when the URL is registered. */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && same(p.get("hub.verify_token") ?? "", VERIFY_TOKEN)) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

interface Change {
  field?: string;
  value?: {
    metadata?: { phone_number_id?: string };
    statuses?: Parameters<typeof applyStatus>[0][];
    messages?: Parameters<typeof recordInbound>[0][];
    contacts?: { wa_id?: string; profile?: { name?: string } }[];
  };
}

export async function POST(request: Request) {
  const raw = await request.text();

  const secret = await getIntegration("whatsapp.cloud.app_secret");
  if (secret) {
    const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
    if (!same(request.headers.get("x-hub-signature-256") ?? "", expected)) {
      return new NextResponse("Bad signature", { status: 401 });
    }
  }

  let body: { entry?: { changes?: Change[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ours = await getIntegration("whatsapp.cloud.phone_number_id");
  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const v = change.value ?? {};
        for (const s of v.statuses ?? []) await applyStatus(s);
        // A reply counts only when it is addressed to our own number.
        const toUs = Boolean(ours) && v.metadata?.phone_number_id === ours;
        for (const m of toUs ? v.messages ?? [] : []) {
          const name = v.contacts?.find((c) => c.wa_id === m.from)?.profile?.name ?? null;
          await recordInbound(m, name);
        }
      }
    }
  } catch (error) {
    logError(error, { route: "/api/whatsapp/cloud", request });
  }
  return NextResponse.json({ ok: true });
}
