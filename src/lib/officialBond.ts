import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logError } from "@/lib/logger";

/**
 * Official PG service bond and seat-leaving terms (2026-11-16; migration 0065, loaded by scripts/import_official_bond.ts).
 * Read by the PG data session from each state's own 2026-27 bulletin / prospectus / GO / gazette, MCC's bulletin and each
 * private or deemed college's own notice. Every figure here is official and carries its source — unlike pg_seat_terms (a
 * third-party compilation), which these rows replace wherever they exist. Server only.
 *
 * Every state's rules have their own shape (jsonb), so the reader keeps them as they are and offers small helpers; pages
 * render the known parts in sections and the rest generically (components/bond/OfficialBond.tsx).
 *
 * Never shown as a figure: anything the file marks "not stated", "lead" or "unverified" (Jharkhand's government bond is a
 * lead only), and any not_verified college row ("ask the college"). Links on hosts the PG data session found compromised
 * are never rendered (`safeUrl`).
 */

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export type JsonObject = { [k: string]: Json };

export type BondStatus = "official_2026_27" | "official_2025_26_only" | "none_in_official_documents" | "not_verified";

export interface Source {
  title: string;
  url: string | null;
  page: string | null;
  quote: string | null;
  date: string | null;
}

export interface OfficialState {
  slug: string;
  /** Our states.name ("Pondicherry"); "MCC" for MCC's rules. */
  state: string;
  /** The name as the source gives it ("Puducherry", "Delhi (NCT)"). */
  label: string;
  asOf: string | null;
  data: JsonObject;
}

export interface OfficialCollege {
  instituteId: number | null;
  slug: string | null;
  name: string;
  state: string;
  status: BondStatus;
  type: string;
  years: number | null;
  what: string | null;
  amount: number | null;
  branches: [string, number][] | null;
  ifNotServed: string | null;
  leaving: string | null;
  deposit: string | null;
  session: string | null;
  source: Source | null;
}

export interface OfficialBond {
  asOf: string | null;
  states: OfficialState[];
  mcc: OfficialState | null;
  colleges: OfficialCollege[];
}

/** Hosts the PG data session found serving spam or redirecting to gambling: never linked. */
const BLOCKED_HOSTS = [/(^|\.)svmcpondy\.com$/i, /(^|\.)iqcitymedicalcollege\.in$/i, /(^|\.)kimsmedicalcollege\.org$/i, /(^|\.)pimslko\.edu\.in$/i];

export function safeUrl(u: unknown): string | null {
  if (typeof u !== "string" || !u) return null;
  try {
    const x = new URL(u.replace(/\)+$/, ""));
    if (!/^https?:$/.test(x.protocol)) return null;
    if (BLOCKED_HOSTS.some((r) => r.test(x.hostname))) return null;
    return x.toString();
  } catch {
    return null;
  }
}

/**
 * Research paths never reach a page: a source title once read "(… identical to D:/Zyn/data/raw/…/rules.pdf)". Applied to
 * every string of the file at load.
 */
export function clean(text: string): string {
  return text
    .replace(/\s*\([^()]*\b[A-Z]:[\\/][^()]*\)/g, "")
    // How a file was found is the reader's business, not the page's: "(linked as 'Information Booklet' in the site
    // menu; file id time-stamp c. 18-10-2026, no date printed)".
    .replace(/\s*\([^()]*\b(file id|time-?stamp|site menu|linked as|posted in|folder)\b[^()]*\)/gi, "")
    .replace(/[;,]?\s*(identical to|copy at|saved (as|at)|local copy:?)\s+[A-Z]:[\\/]\S+/gi, "")
    .replace(/\b[A-Z]:[\\/][^\s,;)]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
function deepClean<T>(v: T): T {
  if (typeof v === "string") return clean(v) as T;
  if (Array.isArray(v)) return v.map(deepClean) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([k]) => k !== "local_copy").map(([k, x]) => [k, deepClean(x)])) as T;
  return v;
}

/** The session a state's rules are for, as a year pair ("2026-27"): the field sometimes carries a sentence. */
export const sessionOf = (s: { data: { session?: unknown } }) =>
  (typeof s.data.session === "string" ? s.data.session.match(/20\d\d-\d\d/)?.[0] : null) ?? "2026-27";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const parse = <T,>(v: unknown): T => (typeof v === "string" ? (JSON.parse(v) as T) : (v as T));
const isObj = (v: unknown): v is JsonObject => !!v && typeof v === "object" && !Array.isArray(v);

/** Sources from a `source` field: one object or a list, deduplicated by link + page. */
export function sourcesOf(v: Json | undefined): Source[] {
  const list = Array.isArray(v) ? v : v ? [v] : [];
  const out: Source[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    if (!isObj(s)) continue;
    const title = str(s.title);
    if (!title) continue;
    const src: Source = { title, url: safeUrl(s.url), page: str(s.page), quote: str(s.quote), date: str(s.date) };
    const key = `${src.url ?? title}|${src.page ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(src);
  }
  return out;
}

const LEAD = /\b(lead|not verified|unverified)\b/i;

/** What a state's government-college bond comes to, for tables and titles. Null figures when nothing is stated. */
export interface GovtBondSummary {
  years: number | null;
  yearsMax: number | null;
  min: number | null;
  max: number | null;
  /** "Not notified" (Haryana), "Not confirmed" (a lead only), or null when there are figures or plain words. */
  flag: "not_notified" | "lead" | null;
  /** A non-numeric rule, as printed ("double the stipend received"), when there is no rupee figure. */
  words: string | null;
}

function numbersIn(v: Json | undefined, depth = 0): number[] {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? [v] : [];
  if (depth > 0 || !isObj(v)) return [];
  return Object.values(v).flatMap((x) => numbersIn(x, depth + 1));
}

export function govtBond(s: OfficialState): GovtBondSummary {
  const g = isObj(s.data.government_service_bond) ? s.data.government_service_bond : {};
  const out: GovtBondSummary = { years: null, yearsMax: null, min: null, max: null, flag: null, words: null };
  if (g.notified === false) out.flag = "not_notified";
  if (g.lead_not_verified) out.flag = "lead";
  const ys = typeof g.years === "number" ? [g.years] : numbersIn(g.years as Json);
  if (ys.length) [out.years, out.yearsMax] = [Math.min(...ys), Math.max(...ys)];
  const amounts = numbersIn(g.amount_inr as Json);
  if (amounts.length && out.flag !== "lead") [out.min, out.max] = [Math.min(...amounts), Math.max(...amounts)];
  else if (typeof g.amount_inr === "string" && !LEAD.test(g.amount_inr)) out.words = g.amount_inr;
  return out;
}

/** The highest rupee figure among a state's deposits (one level deep), for the hub table. */
export function maxDeposit(s: OfficialState): number | null {
  const n = numbersIn(s.data.security_deposit_inr as Json);
  return n.length ? Math.max(...n) : null;
}

/**
 * States whose government bond also binds All India Quota seats in their government colleges, read by hand from each
 * state's `applies_to` words in the 16 Nov 2026 file (a regex read them wrong: "Whether AIQ entrants … is not stated",
 * "through EITHER the All India PG quota OR …"). Gujarat since 2022-23 (circular 14-09-2022); Karnataka "including AIQ";
 * Maharashtra "either the All India PG quota or the state quota". Not here: Assam (not stated), Bihar (only an in-service
 * relaxation for AIQ is printed), AP and Telangana (their prospectus excludes AIQ), Rajasthan (not stated), UP,
 * Uttarakhand (state quota only), Tripura (AIQ only if the candidate takes the state's stipend), Goa (the Rules do not
 * separate the quotas). Re-read `applies_to` after every re-import (`--applies` prints it).
 */
const AIQ_BOUND = new Set(["Tamil Nadu", "Kerala", "Punjab", "Himachal Pradesh", "Chhattisgarh", "Odisha", "Gujarat", "Karnataka", "Maharashtra"]);
export const bindsAiq = (s: OfficialState) => AIQ_BOUND.has(s.state);

async function load(): Promise<OfficialBond | null> {
  try {
    const rules = (await db.execute(sql`SELECT slug, state, label, data, as_of::text AS as_of FROM pg_bond_rules`)) as unknown as {
      slug: string;
      state: string;
      label: string;
      data: unknown;
      as_of: string | null;
    }[];
    const cols = (await db.execute(sql`
      SELECT b.institute_id, b.state, b.status, b.data, i.slug, i.name
        FROM pg_bond_colleges b LEFT JOIN institutes i ON i.id = b.institute_id`)) as unknown as {
      institute_id: number | null;
      state: string;
      status: BondStatus;
      data: unknown;
      slug: string | null;
      name: string | null;
    }[];
    if (!rules.length) return null;
    const all = rules.map((r) => ({ slug: r.slug, state: r.state, label: r.label, asOf: r.as_of, data: deepClean(parse<JsonObject>(r.data)) }));
    const colleges: OfficialCollege[] = cols.map((r) => {
      const d = deepClean(parse<JsonObject>(r.data));
      const official = r.status === "official_2026_27" || r.status === "official_2025_26_only";
      const branches = official && isObj(d.amount_by_branch_as_printed)
        ? (Object.entries(d.amount_by_branch_as_printed).filter(([, v]) => typeof v === "number") as [string, number][])
        : null;
      return {
        instituteId: r.institute_id,
        slug: r.slug,
        name: r.name ?? str(d.college) ?? "",
        state: r.state,
        status: r.status,
        type: str(d.type) ?? "Private",
        // A not_verified row never shows a figure (the PG data session's rule): only "ask the college".
        years: official ? num(d.service_bond_years) : null,
        what: official ? str(d.service_bond_what) : null,
        amount: official ? num(d.service_bond_amount_inr) : null,
        branches: branches?.length ? branches : null,
        ifNotServed: official ? str(d.if_not_served) : null,
        leaving: r.status === "not_verified" ? null : str(d.college_leaving_penalty),
        deposit: r.status === "not_verified" ? null : str(d.security_deposit),
        session: str(d.session),
        source:
          r.status === "not_verified"
            ? null
            : str(d.source_title)
              ? { title: str(d.source_title)!, url: safeUrl(d.source_url), page: str(d.source_page), quote: str(d.quote), date: null }
              : null,
      };
    });
    return {
      asOf: all[0]?.asOf ?? null,
      states: all.filter((s) => s.slug !== "mcc").sort((a, b) => a.state.localeCompare(b.state)),
      mcc: all.find((s) => s.slug === "mcc") ?? null,
      colleges: colleges.sort((a, b) => a.name.localeCompare(b.name)),
    };
  } catch (error) {
    logError(error, { route: "officialBond:load" });
    return null;
  }
}

export const getOfficialBond = unstable_cache(load, ["official-bond-v3"], { revalidate: 3600, tags: ["official-bond"] });

export async function getOfficialBondState(slug: string): Promise<{ state: OfficialState; colleges: OfficialCollege[]; all: OfficialBond } | null> {
  const all = await getOfficialBond();
  const state = all?.states.find((s) => s.slug === slug);
  if (!all || !state) return null;
  return { state, colleges: all.colleges.filter((c) => c.state === state.state), all };
}

/** One PG college's row in the file, by its page slug (any status: a not_verified row says "ask the college"). */
export async function getOfficialCollegeBond(slug: string): Promise<OfficialCollege | null> {
  return (await getOfficialBond())?.colleges.find((c) => c.slug === slug) ?? null;
}

/**
 * Central institutions sit in a state but answer to the Union or their own Act: a state's government bond is not theirs
 * (AIIMS, ESIC, JIPMER, PGIMER, the AFMS and railway hospitals, central universities' colleges, Delhi's central hospitals).
 */
const CENTRAL =
  /\b(aiims|all india institute|esic|esi\b|employees.? state insurance|jipmer|pgimer|post ?graduate institute of medical education|nimhans|armed forces|afmc|command hospital|army|naval|air force|railway|itbp|bsf|crpf|cisf|safdarjung|vardhman mahavir|lady hardinge|ram manohar lohia|dr\.? rml|atal bihari vajpayee institute|banaras hindu|\bbhu\b|institute of medical sciences,? (bhu|banaras)|aligarh muslim|jawaharlal nehru medical college,? aligarh|jamia|hamdard|central|nehru homoeopathic|tata memorial|chittaranjan national cancer|sctimst|sree chitra)/i;
export const isCentralInstitution = (name: string) => CENTRAL.test(name);

/** The state's official rules by our state name ("Uttar Pradesh"). */
export async function getOfficialStateByName(name: string): Promise<OfficialState | null> {
  return (await getOfficialBond())?.states.find((s) => s.state === name) ?? null;
}

/**
 * A college prints its own service bond: years, an amount or branch-wise amounts on an official row. Many official rows
 * say the opposite in words ("No college service bond in the 2026-27 packet") and carry only a leaving penalty.
 */
export const hasOwnBond = (c: OfficialCollege) =>
  c.status.startsWith("official") && ((c.years ?? 0) > 0 || (c.amount ?? 0) > 0 || !!c.branches?.some(([, v]) => v > 0));

export const STATUS_LABEL: Record<BondStatus, string> = {
  official_2026_27: "Official, 2026-27",
  official_2025_26_only: "Official, latest sheet",
  none_in_official_documents: "No bond in its documents",
  not_verified: "Ask the college",
};

/** ₹40 L / ₹1.5 Cr / ₹25,000. */
export function money(v: number): string {
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  if (v >= 1e7) return `₹${trim(v / 1e7)} Cr`;
  if (v >= 1e5) return `₹${trim(v / 1e5)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

export const yearsText = (y: number | null, yMax?: number | null) =>
  y == null ? null : yMax && yMax !== y ? `${y}–${yMax} years` : `${y} year${y === 1 ? "" : "s"}`;

export const rangeText = (min: number | null, max: number | null) =>
  min == null || max == null ? null : min === max ? money(min) : `${money(min)} – ${money(max)}`;
