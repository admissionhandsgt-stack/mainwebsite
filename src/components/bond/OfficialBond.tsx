import { ExternalLink, FileText } from "lucide-react";
import type { ReactNode } from "react";
import Link from "@/components/ui/Link";
import { hasOwnBond, money, noOwnBond, OWN_BOND_TEXT, safeUrl, sourcesOf, STATUS_LABEL, type BondStatus, type Json, type JsonObject, type OfficialCollege, type Source } from "@/lib/officialBond";
import type { ListedTerms } from "@/lib/pgSeatData";

/**
 * Pieces the official bond pages share (2026-11-16): the source line under every figure, the status of a college's row, a
 * generic view of one state's rules (each state's file has its own shape), and the college-by-college table. Server
 * components. Every figure shown here comes from an official document and links it; a not_verified row shows only
 * "ask the college". Local file paths in the data (`local_copy`) and the compromised hosts in lib/officialBond.ts are
 * never rendered.
 */

const LABELS: Record<string, string> = {
  years: "Years of service",
  amount_inr: "Amount",
  what: "What you sign",
  applies_to: "Who it binds",
  release: "Released when",
  go: "Government order",
  who: "Who signs",
  penalty: "Leaving midway",
  also_one_year_compulsory_service: "Also: one year of compulsory service",
  amount_inr_in_service: "In-service candidates",
  central_government_institutes: "Central government institutes in the state",
  amount_note: "Note",
  in_service_remote_area_quota: "In-service, remote-area seats",
  years_by_category: "Years, by category",
  md_ms_vs_diploma: "MD/MS and diploma",
  ladakh_bond: "Ladakh candidates",
  superseded_figures: "Earlier figures (replaced)",
  in_service_bond: "In-service doctors",
  fee_pair_inr_per_year: "Fee a year, with and without the bond",
  afms_exception: "AFMS seats",
  state_service_bond: "Service bond",
  course_leaving_bond: "Leaving the course",
  security_deposit_private: "Security deposit",
  private_service_bond: "Service bond",
  government_debarment: "Debarment, government seats",
  resignation_how: "How to resign",
  resignation: "How to resign",
  security_lost_when: "Deposit lost when",
  note: "Note",
  taken_from: "Taken from",
  all_candidates: "All candidates",
};

/** Keys that are sources, local paths or handled elsewhere — never rendered as a row. */
const SKIP = /^(source|source_\d+|.*_source|security_source.*|seat_leaving_source|documents?|documents_read|local_copy|notified|lead_not_verified|text)$/;

export function label(k: string): string {
  if (LABELS[k]) return LABELS[k];
  if (/\s|\//.test(k) || /[A-Z].*[a-z]/.test(k.slice(1)) && !k.includes("_")) return k; // printed labels ("MD/MS", "Round 1")
  const s = k.replace(/_non_refundable$/, " (non-refundable)").replace(/_inr\b/g, "").replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const isObj = (v: unknown): v is JsonObject => !!v && typeof v === "object" && !Array.isArray(v);
const looksLikeSource = (v: unknown) => isObj(v) && typeof v.title === "string" && ("url" in v || "quote" in v || "page" in v);

/** A number as the rules mean it: a count of years under a "years" key, else rupees ("None" for 0). */
export function amount(v: number, years = false): string {
  if (years) return v.toLocaleString("en-IN");
  if (v === 0) return "None";
  return money(v);
}

/** One value of a state's rules, whatever its shape. `years`: the value sits under a key about years. */
export function JsonView({ value, years = false }: { value: Json | undefined; years?: boolean }): ReactNode {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return <span className="tnum">{amount(value, years)}</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.every(looksLikeSource)) return <Sources sources={sourcesOf(value)} />;
    return (
      <ul className="list-disc space-y-1 pl-5">
        {value.map((x, i) => (
          <li key={i}>
            <JsonView value={x} years={years} />
          </li>
        ))}
      </ul>
    );
  }
  if (looksLikeSource(value)) return <Sources sources={sourcesOf(value)} />;
  return <Rows obj={value} years={years} />;
}

/** An object as label : value rows. */
/** The order a reader wants the bond in: how long, how much, what it is, who it binds, how it ends, the order behind it. */
const ORDER = ["years", "amount_inr", "what", "applies_to", "who", "penalty", "release", "go"];
const rank = (k: string) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length);

export function Rows({ obj, skip = [], years = false }: { obj: JsonObject; skip?: string[]; years?: boolean }) {
  const entries = Object.entries(obj)
    .filter(([k, v]) => v != null && v !== "" && !SKIP.test(k) && !skip.includes(k))
    .sort((a, b) => rank(a[0]) - rank(b[0]));
  if (!entries.length) return null;
  return (
    <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(9rem,14rem)_1fr]">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[13px] font-semibold text-muted-foreground">{label(k)}</dt>
          <dd className="text-[14.5px] leading-relaxed text-foreground">
            <JsonView value={v} years={years || /year/i.test(k)} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Every source in an object (its `source`-like keys), deduplicated. */
export function sourcesIn(obj: JsonObject | undefined): Source[] {
  if (!obj) return [];
  const all = Object.entries(obj)
    .filter(([k]) => /^(source|source_\d+|.*_source|security_source.*|seat_leaving_source|documents)$/.test(k))
    .flatMap(([, v]) => sourcesOf(v));
  const seen = new Set<string>();
  return all.filter((s) => {
    const key = `${s.url ?? s.title}|${s.page ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** "p. 28" for a page number ("pdf 17" → "p. 17"); a page given in words ("web page") is left out. */
export function pageLabel(page: string | null): string | null {
  if (!page) return null;
  const m = page.match(/^(?:pdf\s*)?(\d[\d\s,–-]*)(.*)$/i);
  return m ? `p. ${m[1].trim()}${m[2] ? m[2] : ""}`.trim() : null;
}

function SourceLine({ s }: { s: Source }) {
  const where = pageLabel(s.page);
  return (
    <>
      {s.url ? (
        <a href={s.url} target="_blank" rel="noopener nofollow" className="font-semibold text-primary-strong underline-offset-2 hover:underline dark:text-primary">
          {s.title}
          {where ? `, ${where}` : ""}
          <ExternalLink className="ml-1 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
        </a>
      ) : (
        <span className="font-semibold text-foreground">
          {s.title}
          {where ? `, ${where}` : ""}
          <span className="font-normal text-muted-foreground"> (not linked: the site carries unrelated content)</span>
        </span>
      )}
      {s.quote && <span className="text-muted-foreground"> — “{s.quote}”</span>}
    </>
  );
}

/** "Source: …" under a figure; a numbered list when there are several. */
export function Sources({ sources, className = "" }: { sources: Source[]; className?: string }) {
  // Owner, 2026-11-16: "source karke original notice die hai wo hatado last mai ek jagah likhdo sourced from official
  // updates". The sources stay in the data (and SHOW_SOURCES brings them back); the pages end with <SourcedNote>.
  if (!SHOW_SOURCES || !sources.length) return null;
  return (
    <div className={`text-[12.5px] leading-relaxed ${className}`}>
      <p className="flex items-center gap-1.5 font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {sources.length === 1 ? "Source" : "Sources"}
      </p>
      {sources.length === 1 ? (
        <p className="mt-1">
          <SourceLine s={sources[0]} />
        </p>
      ) : (
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          {sources.map((s, i) => (
            <li key={`${s.url ?? s.title}-${s.page ?? i}`}>
              <SourceLine s={s} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const STATUS_TONE: Record<BondStatus, string> = {
  official_2026_27: "border-signal-safe/40 bg-signal-safe/10 text-foreground",
  official_2025_26_only: "border-primary/30 bg-primary-soft text-foreground",
  none_in_official_documents: "border-border bg-surface-2 text-foreground",
  not_verified: "border-signal-borderline/40 bg-signal-borderline/10 text-foreground",
};

export function StatusChip({ status }: { status: BondStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Per-figure source lists are off (owner's call, 2026-11-16); flip to bring them back. */
const SHOW_SOURCES = false;

/** The one line a bond or stipend page ends with, in place of the per-figure sources. */
export function SourcedNote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="container-custom pb-10 pt-2 text-[12.5px] leading-relaxed text-muted-foreground">
      <FileText className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
      {text}
    </p>
  );
}

/** A college's own service bond, in words: "1 year · ₹10 L if not served", or branch by branch. */
export function collegeBondText(c: OfficialCollege): string | null {
  if (c.status === "not_verified") return null;
  if (OWN_BOND_TEXT[c.ourId]) return OWN_BOND_TEXT[c.ourId];
  if (c.status === "none_in_official_documents") return "0 years · no service bond in its own PG documents";
  if (noOwnBond(c)) return "0 years · no service bond of its own";
  const parts = [c.years ? `${c.years} year${c.years === 1 ? "" : "s"}` : null, c.amount ? `${money(c.amount)} if not served` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : c.what;
}

/** Branch-by-branch amounts as printed, highest first, a free branch as "no bond". */
export function BranchAmounts({ branches }: { branches: [string, number][] }) {
  const sorted = [...branches].sort((a, b) => b[1] - a[1]);
  return (
    <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
      {sorted.map(([b, v], i) => (
        <span key={b}>
          {i > 0 && " · "}
          {b} <span className="tnum font-semibold text-foreground">{v ? money(v) : "no bond"}</span>
        </span>
      ))}
    </p>
  );
}

/** Where a college's figure comes from, in a few words: "2026-27 notice", "2025-26 sheet (latest)". */
export function sourceWords(status: string, session: string | null): string {
  if (status === "official_2025_26_only" || status === "official_older") {
    const y = session?.match(/20\d\d-\d\d/)?.[0];
    return y ? `${y} sheet (latest)` : "latest official sheet";
  }
  if (status === "none_in_official_documents") return "2026-27 documents";
  if (status === "states_no_stipend") return session?.match(/20\d\d/)?.[0] ? `official record, ${session.match(/20\d\d/)![0]}` : "official record";
  return "2026-27 notice";
}

/** The words beside a figure taken from the counselling listing (pg_seat_terms), never called official. */
export const LISTED = "as listed for the counselling";

/** A college's bond as listed for the counselling (`ListedTerms`, lib/pgSeatData.ts), in words. */
export function listedBondText(l: ListedTerms | null | undefined): string | null {
  if (!l || l.bondUnknown) return null;
  if (!l.bondYears) return "0 years · no service bond";
  return `${l.bondYears} year${l.bondYears === 1 ? "" : "s"}${l.bondPenalty ? ` · ${money(l.bondPenalty)} if not served` : ""}`;
}
/** What leaving the seat costs, as listed. */
export function listedExitText(l: ListedTerms | null | undefined): string | null {
  if (!l) return null;
  if (l.exitPenalty) return `${money(l.exitPenalty)} to leave the seat`;
  if (l.exitFullCourseFee) return "The full course fee to leave the seat";
  return null;
}
/** The stipend a month in years 1–3, as listed (MD/MS seats only). */
export function listedStipendText(l: ListedTerms | null | undefined): string | null {
  if (!l?.stipend[0]) return null;
  return l.stipend.map((v) => (v ? `₹${v.toLocaleString("en-IN")}` : "—")).join(" · ");
}

/**
 * Every private and deemed college of a state, one row each in the same three columns (owner, 2026-11-16: no row of "ask
 * the college", and no college left out — "humko kya hi information hai colleges ki then?"): the college with where its
 * terms come from, its service bond (branch by branch where printed), and what leaving the course costs with the deposit.
 * A college whose own notice is not read shows its terms as listed for the counselling, marked so, with the caveat (`note`)
 * under the table; one with nothing listed follows the state's rules shown above the table.
 */
export function CollegeBondTable({
  id,
  colleges,
  listed = {},
  note,
}: {
  id: string;
  colleges: OfficialCollege[];
  listed?: Record<string, ListedTerms>;
  note: string;
}) {
  let anyListed = false;
  const body = colleges.map((c) => {
    const l = c.instituteId != null ? listed[String(c.instituteId)] : undefined;
    const fromListing = c.status === "not_verified";
    const bond = fromListing ? listedBondText(l) : collegeBondText(c);
    const exit = listedExitText(l);
    if (fromListing && (bond || exit)) anyListed = true;
    if (!fromListing && !c.leaving && !c.deposit && exit) anyListed = true;
    const amt = fromListing ? l?.bondPenalty : (c.amount ?? (c.branches ? Math.max(...c.branches.map((b) => b[1])) : null));
    return (
      <tr
        key={`${c.instituteId}-${c.name}`}
        data-row=""
        data-f-status={fromListing ? "listed" : noOwnBond(c) ? "none" : hasOwnBond(c) ? "official" : "other"}
        data-f-type={c.type.toLowerCase().startsWith("deemed") ? "deemed" : "private"}
        data-s-name={c.name.toLowerCase()}
        {...(amt ? { "data-s-amt": amt } : {})}
        className="align-top"
      >
        <th scope="row" className="px-4 py-2.5 font-medium">
          {c.slug ? (
            <Link href={`/md-ms-india/colleges/${c.slug}#official-bond`} className="text-foreground hover:text-primary hover:underline">
              {c.name}
            </Link>
          ) : (
            <span className="text-foreground">{c.name}</span>
          )}
          <span className="mt-0.5 block text-[12px] font-normal text-muted-foreground">
            {c.type} · {fromListing ? (bond || exit ? LISTED : "the state's rules above") : sourceWords(c.status, c.session)}
          </span>
        </th>
        <td className="px-4 py-2.5 text-[13.5px] leading-snug">
          {fromListing ? (
            <span className={bond ? "font-semibold text-foreground" : "text-foreground"}>{bond ?? "As the state's rules for private seats above"}</span>
          ) : (
            <>
              <span className={`text-foreground ${!bond || bond.length < 80 ? "font-semibold" : ""}`}>{bond ?? "As its notice prints it"}</span>
              {c.what && bond !== c.what && !noOwnBond(c) && <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{c.what}</span>}
              {c.branches && <BranchAmounts branches={c.branches} />}
              {c.ifNotServed && !c.branches && <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{c.ifNotServed}</span>}
            </>
          )}
        </td>
        <td className="px-4 py-2.5 text-[13px] leading-snug text-foreground">
          {fromListing ? (
            (exit ?? <span className="text-muted-foreground">As the state's rules above</span>)
          ) : (
            <>
              {c.leaving ??
                (!c.deposit &&
                  (exit ? (
                    <>
                      {exit} <span className="text-muted-foreground">({LISTED})</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">As the state's rules above</span>
                  )))}
              {c.deposit && <span className={`${c.leaving ? "mt-1 " : ""}block text-[12.5px] text-muted-foreground`}>Deposit: {c.deposit}</span>}
            </>
          )}
        </td>
      </tr>
    );
  });
  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table id={id} className="dt w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="w-[30%] px-4 py-2.5 font-semibold">College</th>
              <th scope="col" className="w-[36%] px-4 py-2.5 font-semibold">Its service bond</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Leaving the course · deposit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{body}</tbody>
        </table>
      </div>
      {anyListed && note && <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{note}</p>}
    </>
  );
}

export { safeUrl };
