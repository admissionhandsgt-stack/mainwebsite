import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logError } from "@/lib/logger";

/**
 * The stipend / bond research pass (migration 0067, scripts/import_college_research.ts; owner, 2026-11-16: "deep jao blogs
 * news forums… sahi info honi chaiye").
 *
 * PUBLIC: only a CORROBORATED stipend (two or more independent sources agree) is ever read for a public page, by
 * `getReportedStipends` — shown as "reported", below a college's official figure and above the counselling listing.
 * STAFF ONLY: everything else, the concerns above all (residents' complaints, NMC fines, an ED charge-sheet), is read by
 * `listCollegeResearch` for the admin screen, which checks the session itself. Never import that into a public page.
 */

export interface ReportedStipend {
  y: [number | null, number | null, number | null];
  session: string | null;
}

interface Src {
  url?: string;
  type?: string;
  date?: string;
  quote?: string;
  value?: string | number;
}
export interface ResearchField {
  status?: string;
  y1?: number | null;
  y2?: number | null;
  y3?: number | null;
  years?: number | null;
  amount_inr?: number | null;
  seat_leaving?: string | null;
  deposit?: string | null;
  session?: string | null;
  notes?: string | null;
  sources?: Src[];
}
export interface ResearchRow {
  instituteId: number;
  name: string;
  slug: string | null;
  state: string | null;
  stipend: ResearchField | null;
  bond: ResearchField | null;
  concerns: { what?: string; sources?: Src[] }[];
  checkedOn: string;
}

const parse = <T,>(v: unknown): T | null => (v == null ? null : typeof v === "string" ? (JSON.parse(v) as T) : (v as T));
const n = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);

interface Reported {
  /** By institute id (state tables) and by page slug (a college page). */
  byId: Record<string, ReportedStipend>;
  bySlug: Record<string, ReportedStipend>;
}
async function loadReported(): Promise<Reported> {
  const out: Reported = { byId: {}, bySlug: {} };
  try {
    const rows = (await db.execute(sql`
      SELECT r.institute_id, i.slug, r.stipend FROM college_research r JOIN institutes i ON i.id = r.institute_id
       WHERE r.stipend->>'status' = 'corroborated'`)) as unknown as { institute_id: number; slug: string | null; stipend: unknown }[];
    for (const r of rows) {
      const s = parse<ResearchField>(r.stipend);
      if (!s || !n(s.y1)) continue;
      // A year only when the research recorded a clean one ("2025-26"); its notes ("Y1: NMC report 2024; Y2/Y3: blogs…")
      // stay on the staff screen.
      const v: ReportedStipend = { y: [n(s.y1), n(s.y2), n(s.y3)], session: /^20\d\d(-\d\d)?$/.test(s.session?.trim() ?? "") ? s.session!.trim() : null };
      out.byId[String(r.institute_id)] = v;
      if (r.slug) out.bySlug[r.slug] = v;
    }
  } catch (error) {
    logError(error, { route: "collegeResearch:reported" });
  }
  return out;
}

/** Every corroborated stipend: the one figure from the research a public page may show. */
export const getReportedStipends = unstable_cache(loadReported, ["college-research-reported-v2"], { revalidate: 3600, tags: ["college-research"] });

/** STAFF ONLY: the whole research pass, concerns first. Read by /admin/college-notes, which checks the session. */
export async function listCollegeResearch(): Promise<ResearchRow[]> {
  const rows = (await db.execute(sql`
    SELECT r.institute_id, i.name, i.slug, r.state, r.stipend, r.bond, r.concerns, r.checked_on::text AS checked_on
      FROM college_research r JOIN institutes i ON i.id = r.institute_id
     ORDER BY (r.concerns IS NULL), r.state, i.name`)) as unknown as {
    institute_id: number;
    name: string;
    slug: string | null;
    state: string | null;
    stipend: unknown;
    bond: unknown;
    concerns: unknown;
    checked_on: string;
  }[];
  return rows.map((r) => ({
    instituteId: r.institute_id,
    name: r.name,
    slug: r.slug,
    state: r.state,
    stipend: parse<ResearchField>(r.stipend),
    bond: parse<ResearchField>(r.bond),
    concerns: parse<{ what?: string; sources?: Src[] }[]>(r.concerns) ?? [],
    checkedOn: r.checked_on,
  }));
}
