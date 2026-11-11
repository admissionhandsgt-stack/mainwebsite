import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { limitOr429 } from "@/lib/rateLimit";

/**
 * A state's fee PDF by its unguessable token (lib/waPdf.ts) — the address Meta fetches when the official number sends
 * the file into a student's chat. An old token keeps working, so a PDF already sent stays openable. Anything else: 404.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, props: { params: Promise<{ token: string }> }) {
  const limited = limitOr429(request, "wa-pdf", 30);
  if (limited) return limited;
  const { token } = await props.params;
  if (!/^[a-f0-9]{32}$/.test(token)) return new Response("Not found", { status: 404 });
  const r = (await db.execute(sql`SELECT content, filename FROM lead_pdfs WHERE token = ${token} LIMIT 1`)) as unknown as {
    content: Buffer;
    filename: string;
  }[];
  if (!r[0]) return new Response("Not found", { status: 404 });
  const bytes = new Uint8Array(r[0].content);
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${r[0].filename.replace(/[^A-Za-z0-9._-]/g, "-")}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
