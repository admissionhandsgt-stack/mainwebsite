/**
 * The one list of NEET PG branches, with their complete names (2026-10-16).
 *
 * Every place a student names a branch — the predictor's profile, the sign-in
 * profile step, the lead form — offers these exact names, so what they pick is
 * word for word what lands in the leads table, the counsellors' sheet and the
 * AH Counselor app's branch_prefs. The CMS's short list ("E.N.T.",
 * "Obstetrics & Gynae") is no longer offered anywhere a student types.
 *
 * Source, in order:
 *   1. the AH Counselor app's branch guide (GET /api/integrations/website/branches),
 *      fetched at most daily into `integrations.counselor.branches`;
 *   2. otherwise our own seat data's 101 course names (the same neetpg_app.db
 *      names), grouped by specialty here.
 *
 * Server only — the picker reads it through /api/content/branches.
 */

import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { getIntegration, setIntegration } from "@/lib/integrations";
import { logError } from "@/lib/logger";

export interface BranchGroup {
  /** The specialty, as a person says it: "Radio Diagnosis". */
  key: string;
  /** Clinical / Para-clinical / Pre-clinical / Surgical …, where known. */
  group?: string;
  /** The exact course names, most seats first: "MD Radio Diagnosis", "DNB Radio Diagnosis" … */
  variants: string[];
}

/** One specialty, however the course name spells it. */
const SPECIALTY: [RegExp, string][] = [
  [/^(anaesthes|anesthes)/i, "Anaesthesiology"],
  [/^(child health|paediatrics$|pediatrics$)/i, "Paediatrics"],
  [/^paediatric surgery/i, "Paediatric Surgery"],
  [/^(oto-?rhino|ent$)/i, "ENT"],
  [/^radio[- ]?diagnosis/i, "Radio Diagnosis"],
  [/^(radio ?therapy|radiation (oncology|medicine))/i, "Radiation Oncology"],
  [/^orthop(a)?edics?/i, "Orthopaedics"],
  [/^traumatology/i, "Traumatology & Surgery"],
  [/^obstetrics/i, "Obstetrics & Gynaecology"],
  [/^dermatology/i, "Dermatology"],
  [/^(tuberculosis|respiratory)/i, "Respiratory Medicine (TB & Chest)"],
  [/^(psychiatry|psychological medicine)/i, "Psychiatry"],
  [/^bio-?chemistry/i, "Biochemistry"],
  [/^immuno/i, "Transfusion Medicine"],
  [/^(community medicine|social & preventive|public health)/i, "Community Medicine"],
  [/^(health administration|hospital administration|community health administration)/i, "Hospital Administration"],
  [/^geriatric/i, "Geriatrics"],
  [/^neuro ?surgery/i, "Neurosurgery"],
  [/^(clinical pathology|pathology|lab medicine)/i, "Pathology"],
  [/^tropical medicine/i, "Tropical Medicine"],
];

function specialtyOf(name: string): string {
  const core = name
    .replace(/^(MD|MS|DNB|MCh|M\.Ch\.?|Diploma in|Master of)\s+/i, "")
    .replace(/-NBE$/i, "")
    .replace(/\s*\(\d+ years\)$/i, "")
    .trim();
  for (const [re, key] of SPECIALTY) if (re.test(core)) return key;
  return core;
}

/** Our seat data's names, grouped — the fallback when the app's guide is not available. */
async function fromSeatData(): Promise<BranchGroup[]> {
  const rows = (await db.execute(sql`
    SELECT c.name, count(*)::int AS seats
      FROM seat_options s JOIN courses c ON c.id = s.course_id
     WHERE s.level = 'pg'
     GROUP BY c.name ORDER BY seats DESC, c.name
  `)) as unknown as { name: string; seats: number }[];
  const groups = new Map<string, BranchGroup>();
  for (const r of rows) {
    const key = specialtyOf(r.name);
    if (!groups.has(key)) groups.set(key, { key, variants: [] });
    groups.get(key)!.variants.push(r.name);
  }
  return [...groups.values()];
}

/** The app's guide, if it has answered within the day. */
async function fromCounselor(): Promise<BranchGroup[] | null> {
  const raw = await getIntegration("counselor.branches");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { groups?: BranchGroup[] };
    const groups = (parsed.groups ?? []).filter((g) => g?.key && Array.isArray(g.variants) && g.variants.length);
    return groups.length ? groups : null;
  } catch {
    return null;
  }
}

export const getBranchCatalogue = unstable_cache(
  async (): Promise<BranchGroup[]> => (await fromCounselor()) ?? (await fromSeatData()),
  ["branch-catalogue-v2"],
  { revalidate: 3600, tags: ["branch-catalogue"] },
);

/**
 * Pulls the AH Counselor app's branch guide, at most once a day. Called from the
 * two-minute cron; does nothing until that endpoint exists (404) and never throws.
 */
export async function refreshBranchCatalogue(): Promise<string> {
  try {
    const [url, key, at] = await Promise.all([
      getIntegration("counselor.sync_url"),
      getIntegration("counselor.sync_key"),
      getIntegration("counselor.branches_at"),
    ]);
    if (!url || !key) return "not configured";
    // `at` is when to try next: a day after a success, an hour after a failure.
    if (at && Date.now() < Number(at)) return "fresh";
    await setIntegration("counselor.branches_at", String(Date.now() + 3600_000));
    const r = await fetch(url.replace(/\/upsert$/, "/branches"), {
      headers: { "x-ah-sync-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return `endpoint answered ${r.status}`;
    // Shape agreed with the app's session (zyn-4a), 2026-10-16:
    // { ok, count, groups: [{ key, group, group_label, course_type, variants }] } — 34 groups in the
    // guide's order, variants MD/MS/MCh then DNB then Diploma. Taken as given, never re-grouped here:
    // their guide is the authority (it was correcting "MD Lab Medicine" out of Radio Diagnosis).
    const j = (await r.json()) as { ok?: boolean; groups?: (BranchGroup & { group_label?: string })[] };
    const groups = (j.groups ?? [])
      .filter((g) => g?.key && Array.isArray(g.variants) && g.variants.length)
      .map((g) => ({
        key: String(g.key),
        group: g.group_label ? String(g.group_label) : g.group ? String(g.group) : undefined,
        variants: g.variants.map(String),
      }));
    if (!groups.length) return "endpoint returned no groups";
    await setIntegration("counselor.branches", JSON.stringify({ groups }));
    await setIntegration("counselor.branches_at", String(Date.now() + 24 * 3600_000));
    // The forms pick it up on their next load, not an hour later.
    revalidateTag("branch-catalogue");
    return `stored ${groups.length} groups`;
  } catch (error) {
    logError(error, { route: "branchCatalogue.refresh" });
    return "failed";
  }
}
