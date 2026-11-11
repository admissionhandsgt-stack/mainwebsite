/**
 * Which state counsellings a NEET PG candidate may sit, from the counselling results we hold (2026-11-12, the journey study:
 * "open states for neet pg counselling", "in service quota in neet pg <state>", "neet pg domicile rules" — searched, and the
 * site had no page for them).
 *
 * - **Open states:** the seats our PG source files under its counselling "Open States (Private Institute seats available
 *   for all candidates)" — a state's private-college seats its own counselling allotted to candidates from any state.
 * - **In-service quota:** every quota (or category) whose words say in-service, service, sponsored or government doctor —
 *   the same pattern the predictor uses (`SERVICE_QUOTA_RE`, lib/categoryScope.ts) — by state, with MCC's DNB sponsored
 *   seats for government and PSU doctors apart.
 *
 * Counts are colleges and college × branch options in the latest year each state has, never "seats" (one option is a
 * branch at a college under one quota; its number of seats is not in the results). No rank and no fee here: the fee pages
 * and the state pages carry those. Server only.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { OPEN_STATES_COUNSELLING, SERVICE_QUOTA_RE, stateKey } from "@/lib/categoryScope";
import { getPgStates } from "@/lib/pgStateQueries";

export interface EligCollege {
  name: string;
  slug: string | null;
}

export interface OpenState {
  state: string;
  slug: string | null;
  anchor: string;
  quotas: string[];
  colleges: number;
  options: number;
  year: number | null;
  list: EligCollege[];
}

export interface ServiceState {
  state: string;
  slug: string | null;
  anchor: string;
  quotas: { label: string; colleges: number; options: number; dnb: boolean }[];
  colleges: number;
  options: number;
  year: number | null;
  list: EligCollege[];
}

export interface PgEligibility {
  year: number | null;
  open: OpenState[];
  /** PG states whose counselling, in our results, kept every seat for its own candidates. */
  ownOnly: { state: string; slug: string }[];
  openColleges: number;
  openOptions: number;
  service: ServiceState[];
  serviceColleges: number;
  serviceOptions: number;
  /** MCC's DNB sponsored seats for government / PSU doctors, all states together. */
  sponsored: { colleges: number; options: number; states: number } | null;
}

const anchorOf = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

type Row = { state: string | null; quota: string; institute_id: number; name: string; slug: string | null; course_id: number; yr: number | null; dnb: boolean };

export const getPgEligibility = unstable_cache(
  async (): Promise<PgEligibility | null> => {
    try {
      const [openRows, serviceRows, states] = await Promise.all([
        db.execute(sql`
          SELECT s.name AS state, q.label AS quota, i.id AS institute_id, i.name, i.slug, so.course_id, so.latest_year AS yr, false AS dnb
            FROM seat_options so
            JOIN counsellings c ON c.id = so.counselling_id
            JOIN quotas q ON q.id = so.quota_id
            JOIN institutes i ON i.id = so.institute_id
            LEFT JOIN states s ON s.id = i.state_id
           WHERE so.level = 'pg' AND c.name ILIKE ${OPEN_STATES_COUNSELLING}`),
        db.execute(sql`
          SELECT s.name AS state, q.label AS quota, i.id AS institute_id, i.name, i.slug, so.course_id, so.latest_year AS yr,
                 (c.name ILIKE 'DNB Sponsored%') AS dnb
            FROM seat_options so
            JOIN counsellings c ON c.id = so.counselling_id
            JOIN quotas q ON q.id = so.quota_id
            JOIN categories cat ON cat.id = so.category_id
            JOIN institutes i ON i.id = so.institute_id
            LEFT JOIN states s ON s.id = i.state_id
           WHERE so.level = 'pg' AND (q.label ~* ${SERVICE_QUOTA_RE} OR cat.code ~* ${SERVICE_QUOTA_RE})`),
        getPgStates().catch(() => []),
      ]);
      const slugOf = new Map<string, string>(states.map((s) => [stateKey(s.name), s.slug] as [string, string]));
      const group = (rows: Row[]) => {
        const by = new Map<string, Row[]>();
        for (const r of rows) {
          if (!r.state) continue;
          (by.get(r.state) ?? by.set(r.state, []).get(r.state)!).push(r);
        }
        return by;
      };
      const pairs = (rows: Row[]) => new Set(rows.map((r) => `${r.institute_id}:${r.course_id}`)).size;
      const colleges = (rows: Row[]) => new Set(rows.map((r) => r.institute_id)).size;
      const collegeList = (rows: Row[]): EligCollege[] => {
        const seen = new Map<number, EligCollege>();
        for (const r of rows) if (!seen.has(r.institute_id)) seen.set(r.institute_id, { name: r.name, slug: r.slug });
        return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
      };
      const maxYear = (rows: Row[]) => rows.reduce<number | null>((m, r) => (r.yr && (!m || r.yr > m) ? r.yr : m), null);

      const oRows = openRows as unknown as Row[];
      const open: OpenState[] = [...group(oRows)].map(([state, rows]) => ({
        state,
        slug: slugOf.get(stateKey(state)) ?? null,
        anchor: anchorOf(state),
        quotas: [...new Set(rows.map((r) => r.quota))],
        colleges: colleges(rows),
        options: pairs(rows),
        year: maxYear(rows),
        list: collegeList(rows),
      }));
      open.sort((a, b) => b.colleges - a.colleges || a.state.localeCompare(b.state));

      const sRows = serviceRows as unknown as Row[];
      const stateRows = sRows.filter((r) => !r.dnb);
      const service: ServiceState[] = [...group(stateRows)].map(([state, rows]) => {
        const byQuota = new Map<string, Row[]>();
        for (const r of rows) (byQuota.get(r.quota) ?? byQuota.set(r.quota, []).get(r.quota)!).push(r);
        return {
          state,
          slug: slugOf.get(stateKey(state)) ?? null,
          anchor: anchorOf(state),
          quotas: [...byQuota]
            .map(([label, qs]) => ({ label, colleges: colleges(qs), options: pairs(qs), dnb: /\bDNB\b/i.test(label) }))
            .sort((a, b) => b.options - a.options),
          colleges: colleges(rows),
          options: pairs(rows),
          year: maxYear(rows),
          list: collegeList(rows),
        };
      });
      service.sort((a, b) => b.colleges - a.colleges || a.state.localeCompare(b.state));
      const dnbRows = sRows.filter((r) => r.dnb);

      const openKeys = new Set(open.map((o) => stateKey(o.state)));
      return {
        year: maxYear([...oRows, ...stateRows]),
        open,
        ownOnly: states.filter((s) => !openKeys.has(stateKey(s.name)) && s.mdms > 0).map((s) => ({ state: s.name, slug: s.slug })),
        openColleges: colleges(oRows),
        openOptions: pairs(oRows),
        service,
        serviceColleges: colleges(stateRows),
        serviceOptions: pairs(stateRows),
        sponsored: dnbRows.length ? { colleges: colleges(dnbRows), options: pairs(dnbRows), states: new Set(dnbRows.map((r) => r.state).filter(Boolean)).size } : null,
      };
    } catch {
      return null;
    }
  },
  ["pg-eligibility-v1"],
  { revalidate: 86_400, tags: ["seat-data"] },
);
