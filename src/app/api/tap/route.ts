import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { limitOr429 } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * One tap on a WhatsApp, call or Telegram link (ClickTracker sends it as a beacon): counted per IST day, page, kind and
 * placement in `cta_taps` (migration 0057). Only the page path is stored — its query string is dropped, so a rank in an
 * address never reaches the table — and never the number dialled or who tapped. Always 204: a beacon reads no answer.
 */
const KINDS = new Set(["whatsapp", "call", "telegram"]);
const none = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const limited = limitOr429(request, "tap", 40, 10 * 60_000);
  if (limited) return none();
  let body: { kind?: unknown; path?: unknown; placement?: unknown };
  try {
    // sendBeacon posts text/plain (no preflight); read the text and parse it.
    body = JSON.parse((await request.text()).slice(0, 1000));
  } catch {
    return none();
  }
  const kind = typeof body.kind === "string" ? body.kind : "";
  const rawPath = typeof body.path === "string" ? body.path : "";
  const path = rawPath.split(/[?#]/)[0].slice(0, 200);
  const placement = typeof body.placement === "string" && /^[a-z0-9_-]{1,40}$/i.test(body.placement) ? body.placement.toLowerCase() : "other";
  // A site path only, of the characters our addresses use.
  if (!KINDS.has(kind) || !/^\/[a-z0-9/_.-]*$/i.test(path) || /^\/(admin|api)(\/|$)/.test(path)) return none();
  try {
    await db.execute(sql`
      INSERT INTO cta_taps (day, path, kind, placement, n)
      VALUES ((now() AT TIME ZONE 'Asia/Kolkata')::date, ${path}, ${kind}, ${placement}, 1)
      ON CONFLICT (day, path, kind, placement) DO UPDATE SET n = cta_taps.n + 1`);
  } catch {
    // A lost tap is not worth an error page; the table is a count, not a record.
  }
  return none();
}
