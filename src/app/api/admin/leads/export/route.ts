import { requireAdmin } from "@/lib/auth";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLUMNS = [
  ["id", "ID"],
  ["created_at", "Received"],
  ["level", "Level"],
  ["name", "Name"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["rank", "Rank"],
  ["category", "Category"],
  ["preferred_branch", "Preferred branch"],
  ["preferred_state", "Preferred state"],
  ["quota_interest", "Quota interest"],
  ["internship_status", "Internship status"],
  ["attempt", "Attempt"],
  ["budget_max", "Budget (max ₹/yr)"],
  ["budget_total_max", "Budget (max ₹ total)"],
  ["mbbs_college", "MBBS college"],
  ["message", "Message"],
  ["source_page", "Source"],
  ["lead_status", "Status"],
  ["is_read", "Read"],
  ["assigned_to", "Assigned to"],
  ["follow_up_on", "Follow up on"],
  ["last_contacted_at", "Last contacted"],
  ["admin_notes", "Notes"],
] as const;

/**
 * Escapes one CSV cell.
 *
 * A value starting with =, +, - or @ is prefixed with a quote: Excel would
 * otherwise treat it as a formula, which is how a submitted phone field
 * becomes code running on someone's machine.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Every lead as a CSV download, newest first. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const rows = (await db.execute(sql`
      SELECT id, created_at, level, name, phone, email, rank, category,
             preferred_branch, preferred_state, quota_interest, internship_status,
             attempt, budget_max, budget_total_max, mbbs_college,
             message, source_page, lead_status, is_read, assigned_to,
             follow_up_on, last_contacted_at, admin_notes
      FROM leads
      ORDER BY created_at DESC
    `)) as unknown as Record<string, unknown>[];

    const header = COLUMNS.map(([, label]) => cell(label)).join(",");
    const body = rows
      .map((r) => COLUMNS.map(([key]) => cell(r[key])).join(","))
      .join("\n");

    const stamp = new Date().toISOString().slice(0, 10);

    return new Response(`${header}\n${body}\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="admissionhands-leads-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logError(error, { route: "/api/admin/leads/export" });
    return Response.json({ error: "Could not build the export." }, { status: 500 });
  }
}
