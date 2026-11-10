/**
 * Links from pages Google has indexed to their neighbours it has not (2026-11-11, owner: "index hue pages se index na
 * hue pages ko internal links… kardo"). Search Console's index map of 8 Nov had 451 pages "discovered – not indexed"
 * and 250 unknown to Google, while 1,250 were indexed; a link from an indexed page tells Google the other page matters.
 *
 * - Only an indexed page carries the block (index_status, pushed from scripts/gsc_coverage.mjs runs by
 *   scripts/push_index_status.mjs).
 * - It links only pages in the sitemap that are not known to be indexed: never inspected, unknown, discovered or crawled
 *   but not indexed.
 * - Neighbours share the page's subject: the same state for colleges and state pages, the same branch for branch pages.
 * - The choice rotates weekly (a stable hash of path + ISO week), so every waiting page gets its turn and a page's links
 *   do not change on every crawl.
 * Server only. Heading words: Admin → Content → "Site: more pages nearby".
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { sitemapGroups, BASE } from "@/lib/sitemapData";
import { getBranches } from "@/lib/branchQueries";
import { collegeName } from "@/lib/collegeName";

const INDEXED = "Submitted and indexed";
const MAX = 8;

interface BoostData {
  indexed: string[];
  paths: string[];
  /** college page path → [short name, state name, state slug] */
  colleges: Record<string, [string, string, string]>;
  states: Record<string, string>;
  branches: Record<string, string>;
}

const rows = <T,>(r: unknown) => r as unknown as T[];

const load = unstable_cache(
  async (): Promise<BoostData> => {
    const [status, groups, inst, states, branches] = await Promise.all([
      db.execute(sql`SELECT path, coverage FROM index_status`),
      sitemapGroups(),
      db.execute(sql`
        SELECT i.slug, i.level::text AS level, i.name, s.name AS state, s.slug AS state_slug
          FROM institutes i LEFT JOIN states s ON s.id = i.state_id WHERE i.is_active`),
      db.execute(sql`SELECT slug, name FROM states`),
      getBranches().catch(() => []),
    ]);
    const paths = Object.values(groups)
      .flat()
      .map((e) => e.url.replace(BASE, "") || "/");
    const colleges: BoostData["colleges"] = {};
    for (const c of rows<{ slug: string; level: string; name: string; state: string | null; state_slug: string | null }>(inst)) {
      if (!c.state || !c.state_slug) continue;
      const path = `${c.level === "pg" ? "/md-ms-india/colleges/" : "/mbbs-india/colleges/"}${c.slug}`;
      colleges[path] = [collegeName(c.name).short, c.state, c.state_slug];
    }
    return {
      indexed: rows<{ path: string; coverage: string }>(status).filter((r) => r.coverage === INDEXED).map((r) => r.path),
      paths,
      colleges,
      states: Object.fromEntries(rows<{ slug: string; name: string }>(states).map((s) => [s.slug, s.name])),
      branches: Object.fromEntries(branches.map((b) => [b.slug, b.name])),
    };
  },
  ["index-boost-v1"],
  { revalidate: 21600, tags: ["index-status", "sitemap"] },
);

/** A stable order that changes once a week (ISO week), so each waiting page takes its turn. */
function weekOrder(path: string): number {
  const d = new Date();
  const week = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000 + 3) / 7);
  let h = 2166136261;
  for (const ch of `${path}|${week}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export interface IndexBoost {
  topic: string;
  links: { href: string; label: string }[];
}

export async function getIndexBoost(path: string | null): Promise<IndexBoost | null> {
  if (!path) return null;
  let d: BoostData;
  try {
    d = await load();
  } catch {
    return null;
  }
  const indexed = new Set(d.indexed);
  if (!indexed.has(path)) return null;
  const inMap = new Set(d.paths);
  const waiting = (p: string) => p !== path && inMap.has(p) && !indexed.has(p);
  const stateName = (slug: string) => d.states[slug] ?? titleCase(slug);
  const branchName = (slug: string) => d.branches[slug] ?? titleCase(slug);
  const label = (p: string): string => {
    if (d.colleges[p]) return d.colleges[p][0];
    let m = p.match(/^\/md-ms-india\/branches\/([^/]+)\/([^/]+)$/);
    if (m) return `${branchName(m[1])} in ${stateName(m[2])}`;
    if ((m = p.match(/^\/md-ms-india\/branches\/([^/]+)$/))) return branchName(m[1]);
    if ((m = p.match(/^\/md-ms-india\/states\/([^/]+)$/))) return `NEET PG in ${stateName(m[1])}`;
    if ((m = p.match(/^\/md-ms-india\/stipend\/([^/]+)$/))) return `PG stipend in ${stateName(m[1])}`;
    if ((m = p.match(/^\/md-ms-india\/fees\/([^/]+)$/))) return `PG fees in ${stateName(m[1])}`;
    if ((m = p.match(/^\/counselling\/neet-pg\/([^/]+)$/))) return `NEET PG counselling in ${stateName(m[1])}`;
    if ((m = p.match(/^\/counselling\/mbbs\/([^/]+)$/))) return `MBBS counselling in ${titleCase(m[1])}`;
    if ((m = p.match(/^\/mbbs-india\/([^/]+)$/))) return `MBBS in ${titleCase(m[1])}`;
    return titleCase(p.split("/").pop() ?? p);
  };
  const pick = (cands: string[]) =>
    [...new Set(cands.filter(waiting))].sort((a, b) => weekOrder(a) - weekOrder(b)).slice(0, MAX);

  let topic = "";
  let cands: string[] = [];
  let m: RegExpMatchArray | null;
  const sameStateColleges = (prefix: string, stateSlug: string) =>
    d.paths.filter((p) => p.startsWith(prefix) && d.colleges[p]?.[2] === stateSlug);
  const statePages = (s: string) => [
    `/md-ms-india/states/${s}`,
    `/counselling/neet-pg/${s}`,
    `/md-ms-india/stipend/${s}`,
    `/md-ms-india/fees/${s}`,
    ...d.paths.filter((p) => p.startsWith("/md-ms-india/branches/") && p.endsWith(`/${s}`)),
  ];

  if (d.colleges[path] && path.startsWith("/md-ms-india/colleges/")) {
    const [, state, s] = d.colleges[path];
    topic = `MD/MS in ${state}`;
    cands = [...statePages(s), ...sameStateColleges("/md-ms-india/colleges/", s)];
  } else if (d.colleges[path] && path.startsWith("/mbbs-india/colleges/")) {
    const [, state, s] = d.colleges[path];
    topic = `MBBS in ${state}`;
    cands = [`/mbbs-india/${s}`, `/counselling/mbbs/${s}`, ...sameStateColleges("/mbbs-india/colleges/", s)];
  } else if ((m = path.match(/^\/md-ms-india\/branches\/([^/]+)\/([^/]+)$/))) {
    topic = `${branchName(m[1])} and NEET PG in ${stateName(m[2])}`;
    cands = [
      ...d.paths.filter((p) => p.startsWith(`/md-ms-india/branches/${m![1]}/`)),
      ...d.paths.filter((p) => p.startsWith("/md-ms-india/branches/") && p.endsWith(`/${m![2]}`)),
      `/md-ms-india/branches/${m[1]}`,
    ];
  } else if ((m = path.match(/^\/md-ms-india\/branches\/([^/]+)$/))) {
    topic = branchName(m[1]);
    cands = [...d.paths.filter((p) => p.startsWith(`/md-ms-india/branches/${m![1]}/`)), ...d.paths.filter((p) => /^\/md-ms-india\/branches\/[^/]+$/.test(p))];
  } else if ((m = path.match(/^\/(?:md-ms-india\/(?:states|stipend|fees)|counselling\/neet-pg)\/([^/]+)$/))) {
    topic = `NEET PG in ${stateName(m[1])}`;
    cands = [...statePages(m[1]), ...sameStateColleges("/md-ms-india/colleges/", m[1])];
  } else if ((m = path.match(/^\/(?:mbbs-india|counselling\/mbbs)\/([^/]+)$/)) && !["colleges", "deemed-universities"].includes(m[1])) {
    topic = `MBBS in ${titleCase(m[1])}`;
    cands = [`/mbbs-india/${m[1]}`, `/counselling/mbbs/${m[1]}`, ...sameStateColleges("/mbbs-india/colleges/", m[1])];
  } else if (path === "/neet-pg-cutoff" || path === "/md-ms-india/branches" || path === "/md-ms-india") {
    topic = "MD/MS branches";
    cands = d.paths.filter((p) => /^\/md-ms-india\/branches\/[^/]+(\/[^/]+)?$/.test(p));
  } else if (path === "/md-ms-india/states" || path === "/counselling") {
    topic = "NEET PG by state";
    cands = d.paths.filter((p) => /^\/(md-ms-india\/states|counselling\/neet-pg|counselling\/mbbs)\/[^/]+$/.test(p));
  } else {
    return null;
  }
  const links = pick(cands).map((href) => ({ href, label: label(href) }));
  return links.length ? { topic, links } : null;
}
