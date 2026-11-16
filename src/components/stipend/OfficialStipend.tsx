import { Landmark, Wallet } from "lucide-react";
import Link from "@/components/ui/Link";
import { LISTED, listedStipendText, Sources, sourceWords, stipendYearsText } from "@/components/bond/OfficialBond";
import type { ListedTerms } from "@/lib/pgSeatData";
import type { ReportedStipend } from "@/lib/collegeResearch";
import { govtFigure, nmcReturn, rupee, STIPEND_STATUS, type GovtStipend, type NationalRule, type StipendCollege, type StipendStatus } from "@/lib/officialStipend";

/**
 * The official stipend's pieces (2026-11-16): a state's government-college rate as its order gives it, each private or
 * deemed college's own figure, NMC's rules, and the box on a PG college page. Server components. A basic-pay state reads
 * "₹56,100 basic + allowances" (never "the stipend"); a state with no official figure shows none; a not_verified college
 * shows only "ask the college". Every figure links its document.
 */

export const KIND_LABEL: Record<GovtStipend["kind"], string> = {
  figures: "From the state's order",
  basic: "Basic pay from the state's order; allowances (DA, NPA…) are paid on top",
  disclosure: "From an official government-college document (no state order with the figures was found)",
  formula: "The state's order gives a formula, not a rupee figure",
  none: "No official order with the rupee figures",
};

/** A state's own label where its source fits no kind (Andhra Pradesh), else the kind's. */
export const kindLabel = (g: GovtStipend) => g.label ?? KIND_LABEL[g.kind];

/** The state's government-college rate: Y1–Y3 as the order gives them, its words, what it covers, the documents. */
export function GovtStipendCard({ g, state, title, listedMedian = null }: { g: GovtStipend; state: string; title: string; listedMedian?: number | null }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary-strong ring-1 ring-primary/15 dark:text-primary">
          <Landmark className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="font-heading text-[17px] font-bold text-foreground">{title}</h3>
      </div>
      <p className="mt-2 text-[13.5px] font-semibold text-muted-foreground">{g.kind === "none" && listedMedian ? "As listed for the counselling" : kindLabel(g)}</p>
      {g.y.some(Boolean) && (
        <dl className="mt-4 grid grid-cols-3 gap-3">
          {g.y.map((v, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-1 px-3 py-2.5">
              <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Year {i + 1}</dt>
              <dd className="tnum font-heading mt-0.5 text-[1.05rem] font-extrabold text-foreground sm:text-[1.2rem]">{v ? rupee(v) : "—"}</dd>
              {v && g.kind === "basic" && <dd className="text-[11.5px] text-muted-foreground">basic + allowances</dd>}
            </div>
          ))}
        </dl>
      )}
      {g.kind === "none" ? (
        listedMedian ? (
          <>
            <p className="tnum mt-3 font-heading text-[1.6rem] font-extrabold text-foreground">
              {rupee(listedMedian)} <span className="text-[14px] font-semibold text-muted-foreground">a month, year 1 (median)</span>
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              What {state}'s government colleges pay, as listed for the counselling: {state} publishes no order with the rupee
              figure. Private and deemed colleges must pay at par with it (NMC's rule).
            </p>
          </>
        ) : (
          <p className="mt-3 text-[14.5px] leading-relaxed text-foreground">
            {state} publishes no order with the government-college rupee figure. Private and deemed colleges must pay at par with
            the state's government colleges (NMC's rule).
          </p>
        )
      ) : (
        <dl className="mt-4 grid gap-x-4 gap-y-2.5 sm:grid-cols-[minmax(8rem,12rem)_1fr]">
          {g.asWritten && (
            <>
              <dt className="text-[13px] font-semibold text-muted-foreground">As written</dt>
              <dd className="text-[14.5px] leading-relaxed text-foreground">{g.asWritten}</dd>
            </>
          )}
          {g.diploma && (
            <>
              <dt className="text-[13px] font-semibold text-muted-foreground">PG diploma</dt>
              <dd className="text-[14.5px] leading-relaxed text-foreground">{g.diploma}</dd>
            </>
          )}
          {g.covers && (
            <>
              <dt className="text-[13px] font-semibold text-muted-foreground">Covers</dt>
              <dd className="text-[14.5px] leading-relaxed text-foreground">{g.covers}</dd>
            </>
          )}
          {g.effectiveFrom && (
            <>
              <dt className="text-[13px] font-semibold text-muted-foreground">From</dt>
              <dd className="text-[14.5px] leading-relaxed text-foreground">{g.effectiveFrom}</dd>
            </>
          )}
          {g.order && (
            <>
              <dt className="text-[13px] font-semibold text-muted-foreground">Order</dt>
              <dd className="text-[14px] leading-relaxed text-muted-foreground">{g.order}</dd>
            </>
          )}
        </dl>
      )}
      <Sources sources={g.sources} className="mt-5 border-t border-border pt-4" />
    </div>
  );
}

const STATUS_TONE: Record<StipendStatus, string> = {
  official_2026_27: "border-signal-safe/40 bg-signal-safe/10",
  official_older: "border-primary/30 bg-primary-soft",
  states_no_stipend: "border-signal-stretch/40 bg-signal-stretch/10",
  not_verified: "border-signal-borderline/40 bg-signal-borderline/10",
};

export function StipendStatusChip({ status }: { status: StipendStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-semibold text-foreground ${STATUS_TONE[status]}`}>
      {STIPEND_STATUS[status]}
    </span>
  );
}

/** A college's own figure in words: "₹30,000 · ₹30,000 · ₹30,000", the document's words, or what the status says. */
export function collegeStipendText(c: StipendCollege, ask = "Official figure not confirmed yet"): string {
  if (c.status === "not_verified") return ask;
  if (c.status === "states_no_stipend") return `No PG stipend at present, as the college's own ${c.session?.match(/20\d\d-\d\d/)?.[0] ?? ""} document says`.replace("  ", " ");
  if (c.y[0]) return stipendYearsText(c.y);
  const n = nmcReturn(c.asWritten);
  if (n) return `${rupee(n.v)} a month${n.stateRate ? " (the state's rate)" : ""}, as it told NMC${n.year ? ` in ${n.year}` : ""}`;
  return c.asWritten ?? "As printed in its document";
}

/**
 * Every private and deemed college of a state, one row each (owner, 2026-11-16: no college left out and no "ask the
 * college"): the college with where its figure comes from, and its stipend a month in years 1–3, branch by branch where
 * printed. A college whose own document is not read shows its stipend as listed for the counselling, marked so, with the
 * caveat (`note`) under the table; one with nothing listed falls under NMC's at-par rule shown above.
 */
export function CollegeStipendTable({
  id,
  colleges,
  listed = {},
  reported = {},
  note,
}: {
  id: string;
  colleges: StipendCollege[];
  listed?: Record<string, ListedTerms>;
  /** Corroborated reports (the research pass), shown before the listing. */
  reported?: Record<string, ReportedStipend>;
  note: string;
}) {
  let anyListed = false;
  const body = colleges.map((c) => {
    const fromListing = c.status === "not_verified";
    const rep = fromListing && c.instituteId != null ? reported[String(c.instituteId)] : undefined;
    const l = c.instituteId != null ? listed[String(c.instituteId)] : undefined;
    const repText = rep?.y[0] ? stipendYearsText(rep.y) : null;
    const listedText = fromListing ? (repText ?? listedStipendText(l)) : null;
    if (listedText) anyListed = true;
    const y1 = fromListing ? (rep?.y[0] ?? l?.stipend[0]) : (c.y[0] ?? nmcReturn(c.asWritten)?.v);
    return (
      <tr
        key={`${c.instituteId}-${c.name}`}
        data-row=""
        data-f-status={fromListing ? "listed" : c.status === "states_no_stipend" ? "none" : "official"}
        data-f-type={c.type.toLowerCase().startsWith("deemed") ? "deemed" : "private"}
        data-s-name={c.name.toLowerCase()}
        {...(y1 ? { "data-s-y1": y1 } : {})}
        className="align-top"
      >
        <th scope="row" className="px-4 py-2.5 font-medium">
          {c.slug ? (
            <Link href={`/md-ms-india/colleges/${c.slug}#official-stipend`} className="text-foreground hover:text-primary hover:underline">
              {c.name}
            </Link>
          ) : (
            <span className="text-foreground">{c.name}</span>
          )}
          <span className="mt-0.5 block text-[12px] font-normal text-muted-foreground">
            {c.type} · {fromListing ? (repText ? "as reported by residents and stipend lists" : listedText ? LISTED : "no published figure") : sourceWords(c.status, c.session)}
          </span>
        </th>
        <td className="px-4 py-2.5 text-[13.5px] leading-snug">
          {fromListing ? (
            <span className={listedText ? "tnum font-semibold text-foreground" : "text-foreground"}>
              {listedText ?? "Not published by the college"}
            </span>
          ) : (
            <>
              <span className={c.y[0] || nmcReturn(c.asWritten) ? "tnum font-semibold text-foreground" : "text-foreground"}>{collegeStipendText(c)}</span>
              {c.branches && (
                <span className="mt-1 block text-[12.5px] leading-relaxed text-muted-foreground">
                  {c.branches.map(([b, v], i) => (
                    <span key={b}>
                      {i > 0 && " · "}
                      {b} <span className="tnum font-semibold text-foreground">{v}</span>
                    </span>
                  ))}
                </span>
              )}
            </>
          )}
        </td>
      </tr>
    );
  });
  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table id={id} className="dt w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="w-[38%] px-4 py-2.5 font-semibold">College</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Stipend a month, year by year</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{body}</tbody>
        </table>
      </div>
      {anyListed && note && <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{note}</p>}
    </>
  );
}

/** NMC's rules: stipend at par with the state's government colleges, and the disclosure every college must publish. */
export function NationalRules({ rules, title }: { rules: NationalRule[]; title: string }) {
  if (!rules.length) return null;
  return (
    <div className="rounded-2xl border border-primary/25 bg-card p-5 md:p-6" id="nmc">
      <h3 className="font-heading text-[17px] font-bold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-4">
        {rules.map((r) => (
          <li key={r.name}>
            <p className="font-semibold text-foreground">{r.name}</p>
            <p className="mt-1 text-[14.5px] leading-relaxed text-foreground">“{r.text}”</p>
            {r.meaning && <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{r.meaning}</p>}
            <Sources sources={r.sources.slice(0, 1)} className="mt-2" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "PG stipend at <college>" on a PG college page (#official-stipend): its own figure from its own document, or — for a
 * state government college with no row of its own — the state's government rate. Replaces the listing's stipend there.
 */
export function CollegeOfficialStipend({
  name,
  row,
  govt,
  state,
  stateSlug,
  listed = null,
  reported = null,
  atPar = null,
  isGovt = false,
}: {
  name: string;
  row: StipendCollege | null;
  govt: GovtStipend | null;
  state: string | null;
  stateSlug: string | null;
  /** The college's stipend as listed for the counselling — shown when its own document is not read (owner, 2026-11-16). */
  listed?: ListedTerms | null;
  /** Two or more independent sources agree on its stipend (the research pass): shown before the listing. */
  reported?: ReportedStipend | null;
  /** The state's government rate, which a private or deemed college must match (NMC's rule). */
  atPar?: GovtStipend | null;
  isGovt?: boolean;
}) {
  // A corroborated report outranks the counselling listing (owner, 2026-11-16: "verified + listing").
  const shown = reported?.y[0] ? { y: reported.y, session: reported.session, reported: true } : listed?.stipend[0] ? { y: listed.stipend, session: listed.session, reported: false } : null;
  if (!row && !govt && !shown) return null;
  const link = stateSlug ? (
    <Link href={`/md-ms-india/stipend/${stateSlug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
      {state} PG stipend, every college →
    </Link>
  ) : null;
  return (
    <section id="official-stipend" className="scroll-mt-24 rounded-2xl border border-primary/25 bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
          <Wallet className="h-5 w-5 text-primary" aria-hidden="true" /> PG stipend at {name}
        </h2>
        {(!row || row.status === "not_verified") && !govt && shown ? (
          <span className="inline-flex items-center rounded-full border border-border bg-surface-1 px-2.5 py-0.5 text-[12px] font-semibold text-muted-foreground">{shown.reported ? "Reported" : "As listed"}</span>
        ) : (
          row && <StipendStatusChip status={row.status} />
        )}
      </div>
      {(!row || row.status === "not_verified") && !govt && shown ? (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-3 sm:max-w-lg">
            {shown.y.map((v, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface-1 px-3 py-2.5">
                <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Year {i + 1}</dt>
                <dd className="tnum font-heading mt-0.5 text-[1.1rem] font-extrabold text-foreground">{v ? rupee(v) : "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
            A month,{" "}
            {shown.reported
              ? `as reported by residents and published stipend lists${shown.session ? ` (${shown.session})` : ""}, `
              : `${LISTED}${shown.session ? ` (${shown.session})` : ""}, `}
            not the college's own document. Our counsellors confirm what it actually pays before you lock the seat.
          </p>
        </>
      ) : row ? (
        <>
          {row.y[0] ? (
            <dl className="mt-4 grid grid-cols-3 gap-3 sm:max-w-lg">
              {row.y.map((v, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface-1 px-3 py-2.5">
                  <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Year {i + 1}</dt>
                  <dd className="tnum font-heading mt-0.5 text-[1.1rem] font-extrabold text-foreground">{v ? rupee(v) : "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-[15px] leading-relaxed text-foreground">{collegeStipendText(row)}</p>
          )}
          {row.status !== "not_verified" && row.asWritten && row.y[0] && <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">As written: {row.asWritten}</p>}
          {row.status === "not_verified" && <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">NMC requires every college to pay PG students at par with the state's government colleges and to publish what it pays. Our counsellors confirm what it pays for you before you choose it.</p>}
          {row.session && row.status !== "not_verified" && <p className="mt-2 text-[13px] text-muted-foreground">Session: {row.session}</p>}
          {row.source && <Sources sources={[row.source]} className="mt-4 border-t border-border pt-4" />}
        </>
      ) : (
        <>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground">
            <span className="font-semibold">{state}'s government-college rate:</span>{" "}
            {govt!.y[0] ? govt!.y.map((v, i) => (v ? `Y${i + 1} ${govtFigure(govt!, i)}` : null)).filter(Boolean).join(" · ") : govt!.asWritten}
          </p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{kindLabel(govt!)}</p>
          <Sources sources={govt!.sources.slice(0, 2)} className="mt-4 border-t border-border pt-4" />
        </>
      )}
      {link && <p className="mt-4 text-[14px]">{link}</p>}
    </section>
  );
}
