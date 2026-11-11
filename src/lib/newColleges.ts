/**
 * New medical colleges (2026-11-11, the competitive review's "new medical colleges 2026" gap): every college NMC's
 * register lists with an MBBS course whose inception year is the academic year asked for — a Letter of Permission for
 * a new college — with its seats, ownership, state, university and the LoP date NMC prints, and our page for it where
 * NMC's college is matched to one of ours (nmc_institutes). Also the year before, for comparison, and the colleges that
 * raised their MBBS intake. Official: NMC's own register (lib/nmcSync.ts). Server only.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { stateKey } from "@/lib/nmcSync";
import { getMbbsStateSeats } from "@/lib/stateQueries";

export interface NewCollege {
  code: string;
  name: string;
  state: string;
  stateSlug: string | null;
  management: string;
  university: string | null;
  seats: number;
  /** "19 Jul 2026", from NMC's own field or the date its remark prints. */
  lop: string | null;
  /** Our MBBS page, when NMC's college is matched to one of ours. */
  slug: string | null;
}
export interface NewCollegesYear {
  year: number;
  colleges: NewCollege[];
  seats: number;
  govt: { colleges: number; seats: number };
  private: { colleges: number; seats: number };
  byState: { state: string; stateSlug: string | null; colleges: number; seats: number; govt: number }[];
}
export interface NewCollegesData {
  now: NewCollegesYear | null;
  prev: NewCollegesYear | null;
  /** MBBS courses whose approved intake rose over the previous approval. */
  raised: { name: string; state: string; from: number; to: number; slug: string | null }[];
  nmcDate: string | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** NMC's remark prints the LoP date as "19.07.2026" or "13-09-2026". */
function lopOf(date: string | null, remark: string | null): string | null {
  if (date) {
    const d = new Date(date);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  const m = remark?.match(/LoP\s+dated\s+(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/i);
  if (!m) return null;
  const mo = Number(m[2]);
  return mo >= 1 && mo <= 12 ? `${Number(m[1])} ${MONTHS[mo - 1]} ${m[3]}` : null;
}

/** NMC writes some names in capitals ("BONGAIGAON MEDICAL COLLEGE"): title-case those, keep the rest as printed. */
const tidyName = (n: string) =>
  n === n.toUpperCase()
    ? n
        .toLowerCase()
        .replace(/\b([a-z])/g, (c) => c.toUpperCase())
        .replace(/\b(Of|And|For|The|In)\b/g, (w) => w.toLowerCase())
        .replace(/\b(Aiims|Esic|Esi|Gmc|Ims|Gmers)\b/g, (w) => w.toUpperCase())
    : n.replace(/\s+\.\s*/g, ". ").replace(/\s{2,}/g, " ");

export const getNewColleges = unstable_cache(
  async (): Promise<NewCollegesData> => {
    const rows = (await db.execute(sql`
      SELECT c.college_code AS code, c.college_name AS name, c.state_name AS state, c.management_type AS management,
             c.university_name AS university, c.inception_year AS year, c.approved_seat AS seats,
             c.previous_approved_seat AS prev, c.recognition_status AS remark, c.lop_date::text AS lop,
             (SELECT i.slug FROM nmc_institutes m JOIN institutes i ON i.id = m.institute_id
               WHERE m.college_code = c.college_code AND i.level = 'ug' AND i.is_active = true LIMIT 1) AS slug
        FROM nmc_courses c
       WHERE c.course_type = 'M.B.B.S.'`)) as unknown as {
      code: string;
      name: string;
      state: string;
      management: string | null;
      university: string | null;
      year: number | null;
      seats: number | null;
      prev: number | null;
      remark: string | null;
      lop: string | null;
      slug: string | null;
    }[];
    const [states, upd] = await Promise.all([
      getMbbsStateSeats().catch(() => []),
      db.execute(sql`SELECT max(nmc_updated)::text AS d FROM nmc_courses`).catch(() => [] as unknown[]),
    ]);
    const slugOf = new Map<string, string>(states.map((s) => [stateKey(s.name), s.slug] as [string, string]));
    const nameOf = new Map<string, string>(states.map((s) => [stateKey(s.name), s.name] as [string, string]));
    const stateSlug = (name: string) => slugOf.get(stateKey(name)) ?? null;
    // Our spelling of a state where NMC spells it its own way ("Chattisgarh").
    const stateName = (name: string) => nameOf.get(stateKey(name)) ?? name;

    const years = rows.map((r) => r.year ?? 0).filter((y) => y > 2000);
    const latest = years.length ? Math.max(...years) : null;
    const build = (year: number | null): NewCollegesYear | null => {
      if (!year) return null;
      const list: NewCollege[] = rows
        .filter((r) => r.year === year)
        .map((r) => ({
          code: r.code,
          name: tidyName(r.name),
          state: stateName(r.state),
          stateSlug: stateSlug(r.state),
          management: r.management ?? "—",
          university: r.university,
          seats: Number(r.seats) || 0,
          lop: lopOf(r.lop, r.remark),
          slug: r.slug,
        }))
        .sort((a, b) => a.state.localeCompare(b.state) || b.seats - a.seats || a.name.localeCompare(b.name));
      if (!list.length) return null;
      const isGovt = (m: string) => /government/i.test(m);
      const byState = new Map<string, { state: string; stateSlug: string | null; colleges: number; seats: number; govt: number }>();
      for (const c of list) {
        const s = byState.get(c.state) ?? { state: c.state, stateSlug: c.stateSlug, colleges: 0, seats: 0, govt: 0 };
        s.colleges++;
        s.seats += c.seats;
        if (isGovt(c.management)) s.govt++;
        byState.set(c.state, s);
      }
      const g = list.filter((c) => isGovt(c.management));
      const p = list.filter((c) => !isGovt(c.management));
      return {
        year,
        colleges: list,
        seats: list.reduce((a, c) => a + c.seats, 0),
        govt: { colleges: g.length, seats: g.reduce((a, c) => a + c.seats, 0) },
        private: { colleges: p.length, seats: p.reduce((a, c) => a + c.seats, 0) },
        byState: [...byState.values()].sort((a, b) => b.seats - a.seats || a.state.localeCompare(b.state)),
      };
    };
    const raised = rows
      .filter((r) => r.prev != null && r.seats != null && r.prev > 0 && r.seats > r.prev && r.year !== latest)
      .map((r) => ({ name: tidyName(r.name), state: stateName(r.state), from: Number(r.prev), to: Number(r.seats), slug: r.slug }))
      .sort((a, b) => b.to - b.from - (a.to - a.from) || a.name.localeCompare(b.name));
    const d = (upd as unknown as { d: string | null }[])[0]?.d ?? null;
    return { now: build(latest), prev: build(latest ? latest - 1 : null), raised, nmcDate: d };
  },
  ["new-colleges-v1"],
  { revalidate: 6 * 3600, tags: ["nmc"] },
);
