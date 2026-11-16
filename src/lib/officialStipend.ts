import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logError } from "@/lib/logger";
import { deepClean, safeUrl, type JsonObject, type Source } from "@/lib/officialBond";

/**
 * Official PG (MD/MS) stipend, 2026-27 (migration 0066, loaded by scripts/import_official_stipend.ts). Read by the PG data
 * session from each state's own order — or, where no order could be read, a government college's own NMC disclosure,
 * labelled so — NMC's rules, and each private or deemed college's own published stipend. It replaces the third-party
 * compilation (fees.stipend_*_inr) wherever it reaches. MD/MS only: no DNB / NBEMS figure is in it. Server only.
 *
 * The rules a page must keep (the PG data session's): a state whose order gives BASIC pay only (UP, Haryana, Rajasthan's
 * "+ DA") is shown as basic + allowances, never as "the stipend"; a state with no official figure shows none (its notes
 * hold press "leads", which are not figures); a private college is never filled from the state rate; a not_verified
 * college shows only "ask the college".
 */

export type StipendStatus = "official_2026_27" | "official_older" | "states_no_stipend" | "not_verified";

/**
 * How a state's government figure reads:
 * - figures: the order's Y1–Y3 a month;
 * - basic: basic pay only, allowances (DA, NPA, HRA) on top with no rupee total printed;
 * - disclosure: figures from one government college's own NMC disclosure (no order could be read);
 * - formula: a formula, no rupee figure (Odisha, West Bengal, Delhi);
 * - none: no official figure found.
 */
export type GovtKind = "figures" | "basic" | "disclosure" | "formula" | "none";

export interface GovtStipend {
  kind: GovtKind;
  y: [number | null, number | null, number | null];
  /** The order's or document's own words. */
  asWritten: string | null;
  order: string | null;
  covers: string | null;
  effectiveFrom: string | null;
  diploma: string | null;
  sources: Source[];
  /** A state whose source fits no kind's words says what it is (Andhra Pradesh). */
  label: string | null;
}

export interface StipendState {
  slug: string;
  state: string;
  asOf: string | null;
  govt: GovtStipend;
  privateRule: string | null;
  inService: string | null;
}

export interface StipendCollege {
  instituteId: number | null;
  slug: string | null;
  name: string;
  state: string;
  type: string;
  status: StipendStatus;
  y: [number | null, number | null, number | null];
  branches: [string, string][] | null;
  asWritten: string | null;
  session: string | null;
  /** The document prints no "per month" word. */
  periodUnstated: boolean;
  source: Source | null;
}

export interface NationalRule {
  name: string;
  text: string;
  meaning: string | null;
  sources: Source[];
}

export interface OfficialStipend {
  asOf: string | null;
  states: StipendState[];
  national: NationalRule[];
  central: GovtStipend | null;
  colleges: StipendCollege[];
}

const isObj = (v: unknown): v is JsonObject => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null);
const parse = <T,>(v: unknown): T => (typeof v === "string" ? (JSON.parse(v) as T) : (v as T));

function sources(v: unknown): Source[] {
  const list = Array.isArray(v) ? v : v ? [v] : [];
  const out: Source[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    if (!isObj(s) || !str(s.title)) continue;
    const src = { title: str(s.title)!, url: safeUrl(s.url), page: str(s.page), quote: str(s.quote), date: str(s.date) };
    const key = `${src.url ?? src.title}|${src.page ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(src);
  }
  return out;
}

/** Sentences about how a document was found or a press "lead" are the researcher's, not the page's. */
const PROCESS = /(^checked\b|\bseen\b|\bper press\b|\bpress also\b|\blead(?=:)|\bnot opened|\bhttp \d{3}|search[- ]engine|search index|lead only|leads? \(|press[- ]report|careers360|shiksha|collegedunia|reported by|per bond research|placeholder|could not be (read|reached)|was not (read|reached))\b/i;
const sentences = (t: string | null) =>
  t
    ? t
        .split(/(?<=[.;])\s+(?=[A-Z(])/)
        .filter((s) => !PROCESS.test(s))
        .join(" ")
        .trim() || null
    : null;

/**
 * Set by hand from the PG data session's notes on the 16 Nov 2026 file (re-read them on a re-import): states with no
 * official figure (their words hold press leads), and states whose figure comes from one government college's own NMC
 * disclosure because no order could be read. Basic-pay states are read from the file's own qualifier ("BASIC pay only").
 */
const NO_FIGURE = new Set(["Assam", "Chhattisgarh", "Karnataka", "Telangana", "Jammu and Kashmir", "Tripura"]);
/**
 * Andhra Pradesh's figures are the state counselling authority's own prospectus quoting "Govt. of AP orders" — neither the
 * order (not read) nor a college's document (zyn-92, 2026-11-16). A press-reported revision (G.O.Ms.No.141, 2026) is a lead:
 * no figure from it is shown, only the caution.
 */
const KIND_OVERRIDE: Record<string, string> = {
  "Andhra Pradesh":
    "From the state counselling authority's prospectus (Dr NTR UHS 2026-27), quoting Govt of AP orders; the rate may have been revised since, so ask the college",
};
const FROM_DISCLOSURE = new Set(["Maharashtra", "Odisha", "Himachal Pradesh", "Goa", "Uttarakhand", "Punjab", "Andhra Pradesh"]);

function govtOf(g: JsonObject, state = ""): GovtStipend {
  const y: GovtStipend["y"] = [num(g.y1_inr_pm), num(g.y2_inr_pm), num(g.y3_inr_pm)];
  const qualifier = `${str(g.figure_is) ?? ""} ${str(g.y_figures_are) ?? ""}`;
  const asWritten = str(g.as_written);
  const order = str(g.order);
  let kind: GovtKind;
  if (NO_FIGURE.has(state) || (!y[0] && !asWritten)) kind = "none";
  else if (!y[0]) kind = "formula"; // the order's words: a formula (Odisha, West Bengal, Delhi) or rates by stream
  else if (/basic/i.test(qualifier)) kind = "basic";
  else if (FROM_DISCLOSURE.has(state) || /government college document|disclos|declared/i.test(qualifier)) kind = "disclosure";
  else kind = "figures";
  return {
    kind,
    y,
    // A state with no official figure shows none: its words carry the press figures ("lead only").
    asWritten: kind === "none" ? null : sentences(asWritten),
    order: kind === "none" ? null : sentences(order),
    covers: sentences(str(g.covers)),
    effectiveFrom: sentences(str(g.effective_from)?.replace(/,?\s*(and,\s*)?per search index only,?\s*/i, " ").replace(/\s{2,}/g, " ").trim() ?? null),
    diploma: kind === "none" ? null : str(g.diploma),
    sources: kind === "none" ? [] : sources(g.source),
    label: KIND_OVERRIDE[state] ?? null,
  };
}

async function load(): Promise<OfficialStipend | null> {
  try {
    const rules = (await db.execute(sql`SELECT slug, state, data, as_of::text AS as_of FROM pg_stipend_rules`)) as unknown as {
      slug: string;
      state: string;
      data: unknown;
      as_of: string | null;
    }[];
    if (!rules.length) return null;
    const cols = (await db.execute(sql`
      SELECT b.institute_id, b.state, b.status, b.data, i.slug, i.name
        FROM pg_stipend_colleges b LEFT JOIN institutes i ON i.id = b.institute_id`)) as unknown as {
      institute_id: number | null;
      state: string;
      status: StipendStatus;
      data: unknown;
      slug: string | null;
      name: string | null;
    }[];
    const all = rules.map((r) => ({ ...r, data: deepClean(parse<JsonObject>(r.data)) }));
    const states: StipendState[] = all
      .filter((r) => r.slug !== "national" && r.slug !== "central")
      .map((r) => ({
        slug: r.slug,
        state: r.state,
        asOf: r.as_of,
        govt: govtOf(isObj(r.data.government_stipend) ? r.data.government_stipend : {}, r.state),
        privateRule: sentences(isObj(r.data.private_colleges) ? str(r.data.private_colleges.rule ?? r.data.private_colleges.as_written ?? r.data.private_colleges.text) : str(r.data.private_colleges)),
        inService: sentences(isObj(r.data.in_service) ? str(r.data.in_service.as_written ?? r.data.in_service.text) : str(r.data.in_service)),
      }))
      .sort((a, b) => a.state.localeCompare(b.state));
    const nat = all.find((r) => r.slug === "national")?.data;
    const national: NationalRule[] = (Array.isArray(nat?.rules) ? nat!.rules : [])
      .filter(isObj)
      .filter((r) => !r.lead_only)
      .map((r) => ({ name: str(r.name) ?? "", text: str(r.text_as_written) ?? "", meaning: str(r.meaning), sources: sources(r.source) }))
      .filter((r) => r.name && r.text);
    const cen = all.find((r) => r.slug === "central")?.data;
    const central = cen && isObj(cen.government_stipend) ? govtOf({ ...cen.government_stipend, figure_is: "basic" }) : null;
    if (central && cen && isObj(cen.government_stipend) && isObj(cen.government_stipend.basic_pay_inr_pm)) {
      const b = cen.government_stipend.basic_pay_inr_pm;
      central.y = [num(b.y1), num(b.y2), num(b.y3)];
      central.kind = central.y[0] ? "basic" : central.kind;
    }
    const colleges: StipendCollege[] = cols.map((r) => {
      const d = deepClean(parse<JsonObject>(r.data));
      const shown = r.status === "official_2026_27" || r.status === "official_older";
      const branches = shown && isObj(d.by_branch_as_printed)
        ? (Object.entries(d.by_branch_as_printed).map(([k, v]) => [k, typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : str(v) ?? ""]).filter(([, v]) => v) as [string, string][])
        : null;
      return {
        instituteId: r.institute_id,
        slug: r.slug,
        name: r.name ?? str(d.college) ?? "",
        state: r.state,
        type: str(d.type) ?? "Private",
        status: r.status,
        // Never a figure on a not_verified row; a "no stipend" row has none to show.
        y: shown ? [num(d.y1_inr_pm), num(d.y2_inr_pm), num(d.y3_inr_pm)] : [null, null, null],
        branches: branches?.length ? branches : null,
        asWritten: r.status === "not_verified" ? null : sentences(str(d.as_written)),
        session: str(d.session),
        periodUnstated: /no ['"‘]?per month|period (is )?not (stated|printed)|does not say per month|no period/i.test(str(d.notes) ?? ""),
        source:
          r.status === "not_verified" || !str(d.source_title)
            ? null
            : { title: str(d.source_title)!, url: safeUrl(d.source_url), page: str(d.source_page), quote: str(d.quote), date: null },
      };
    });
    return { asOf: all[0]?.as_of ?? null, states, national, central, colleges: colleges.sort((a, b) => a.name.localeCompare(b.name)) };
  } catch (error) {
    logError(error, { route: "officialStipend:load" });
    return null;
  }
}

export const getOfficialStipend = unstable_cache(load, ["official-stipend-v7"], { revalidate: 3600, tags: ["official-stipend"] });

export async function getOfficialStipendState(name: string) {
  const all = await getOfficialStipend();
  const state = all?.states.find((s) => s.state === name);
  return all && state ? { state, colleges: all.colleges.filter((c) => c.state === name), all } : null;
}

export async function getOfficialCollegeStipend(slug: string): Promise<StipendCollege | null> {
  return (await getOfficialStipend())?.colleges.find((c) => c.slug === slug) ?? null;
}

/** A college prints its own figure (an official row with a year-1 rupee figure, or its words). */
/**
 * A college's PG figure as its own return to NMC prints it ("Stipend of College: 'UG-Rs.4000/- PG-RS.20000/-'"), for the
 * rows whose only official record is NMC's college-wise list (owner, 2026-11-16: the raw list text read as a research
 * note). "Given as mentioned by state Govt" takes the state figure the same return prints. Null when no PG figure is printed.
 */
export function nmcReturn(text: string | null): { v: number; year: string | null; stateRate: boolean } | null {
  if (!text || !/stipend of college/i.test(text)) return null;
  const year = text.match(/report received in NMC(?: on)?:?\s*'?(\d{4})/i)?.[1] ?? null;
  const pg = (s: string) => {
    const m = s.match(/\bPG[-\s]*(?:1st[-\s]*)?Rs\.?\s*([\d,]{4,})/i);
    const v = m ? Number(m[1].replace(/,/g, "")) : NaN;
    return v >= 1000 && v < 500000 ? v : null;
  };
  const [statePart, collegePart] = text.split(/stipend of college/i);
  const own = pg(collegePart ?? "");
  if (own) return { v: own, year, stateRate: false };
  if (/given as mentioned/i.test(collegePart ?? "")) {
    const st = pg(statePart.split(/stipend of state govt/i)[1] ?? "");
    if (st) return { v: st, year, stateRate: true };
  }
  return null;
}

export const hasOwnStipend = (c: StipendCollege) => c.status.startsWith("official") && (!!c.y[0] || !!c.asWritten);

export const STIPEND_STATUS: Record<StipendStatus, string> = {
  official_2026_27: "Official, 2026-27",
  official_older: "Official, latest sheet",
  states_no_stipend: "Says no stipend",
  not_verified: "Not confirmed yet",
};

export const rupee = (v: number) => `₹${v.toLocaleString("en-IN")}`;

/** "₹55,200 + DA" / "₹56,100 basic + allowances" / "₹77,662" — a government year's figure as it must read. */
export function govtFigure(g: GovtStipend, i = 0): string | null {
  const v = g.y[i];
  if (!v) return null;
  return g.kind === "basic" ? `${rupee(v)} basic + allowances` : rupee(v);
}
