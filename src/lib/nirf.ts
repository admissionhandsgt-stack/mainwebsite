/**
 * NIRF — the National Institutional Ranking Framework of the Ministry of Education — for the college pages' "<college>
 * rankings" answer (Search Console, Oct–Nov 2026: 3,011 impressions a month on UG college pages, 468 on PG). The
 * official Medical list, top 50, with its parameter scores, parsed from nirfindia.org (src/data/nirfMedical2025.json,
 * its `source` and `fetched` inside). Each rank is mapped by hand to our college pages (`ug` / `pg` slugs): NIRF ranks a
 * university where its medical college is what a student applies to (Amrita → Amrita School of Medicine, Kochi), and
 * PGIMER, Sree Chitra, GCRI and the INI-CET institutes' PG seats are not in our lists. Import-free: safe anywhere.
 * When NIRF publishes a newer list, add its file and point LISTS at it.
 */
import medical2025 from "@/data/nirfMedical2025.json";

export interface NirfEntry {
  rank: number;
  year: number;
  list: string;
  name: string;
  score: number;
  tlr: number;
  rpc: number;
  go: number;
  oi: number;
  perception: number;
  source: string;
}

type Row = { rank: number; name: string; score: number; tlr: number; rpc: number; go: number; oi: number; perception: number; ug: string[]; pg: string[] };
const LISTS = [medical2025 as { year: number; list: string; source: string; rows: Row[] }];

const index = new Map<string, NirfEntry>();
for (const l of LISTS)
  for (const r of l.rows)
    for (const [level, slugs] of [["ug", r.ug], ["pg", r.pg]] as const)
      for (const slug of slugs) {
        const k = `${level}|${slug}`;
        if (!index.has(k)) index.set(k, { rank: r.rank, year: l.year, list: l.list, name: r.name, score: r.score, tlr: r.tlr, rpc: r.rpc, go: r.go, oi: r.oi, perception: r.perception, source: l.source });
      }

export function getNirf(slug: string, level: "ug" | "pg"): NirfEntry | null {
  return index.get(`${level}|${slug}`) ?? null;
}
