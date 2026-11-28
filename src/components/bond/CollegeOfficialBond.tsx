import { ScrollText } from "lucide-react";
import Link from "@/components/ui/Link";
import { bindsAiq, govtBond, rangeText, yearsText, type OfficialCollege, type OfficialState, sourcesOf, serviceYears } from "@/lib/officialBond";
import { BranchAmounts, collegeBondText, Rows, Sources, StatusChip } from "@/components/bond/OfficialBond";

/** The words for a college whose bond no official document gives (Admin → Content, "page.college_pg.mcc" bond_ask_*). */
export interface BondAskCopy {
  chip: string;
  line: string;
  items: string[];
  after: string;
}

/**
 * "PG bond at <college>" on a PG college page (2026-11-16), above the seat-terms cards, anchored #official-bond. Either the
 * college's own row from the official file, or — for a state government college with no row of its own — its state's
 * government bond, from the state's own rules. With neither (`ask`, owner 2026-11-28: no figure is claimed where no
 * official document gives one): that the bond is set in the college's admission papers, what to get in writing, and the
 * state's official rules for private seats where its documents give them. The counselling listing's bond years and amount
 * are never shown (listedBondText returns nothing; SeatTerms prints no bond row).
 */
export default function CollegeOfficialBond({
  name,
  row,
  state,
  ask = null,
  privateSeats = true,
}: {
  name: string;
  row: OfficialCollege | null;
  state: OfficialState | null;
  /** No official figure for this college: the words of the block that says what to get in writing. */
  ask?: BondAskCopy | null;
  /** A private or deemed college: the block adds the state's official rules for private seats. */
  privateSeats?: boolean;
}) {
  if (!row && !state && !ask) return null;
  const stateLink = state ? (
    <Link href={`/md-ms-india/bond/${state.slug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
      {state.state}'s PG bond rules in full →
    </Link>
  ) : null;

  // No official figure for this college (no row, or a row its documents could not confirm): no figure, what to ask.
  if ((!row || row.status === "not_verified") && ask) {
    const pc = state?.data.private_colleges;
    return (
      <section id="official-bond" className="scroll-mt-24 rounded-2xl border border-primary/25 bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
            <ScrollText className="h-5 w-5 text-primary" aria-hidden="true" /> PG bond at {name}
          </h2>
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary-soft px-2.5 py-0.5 text-[12px] font-semibold text-primary-strong">
            {ask.chip}
          </span>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground">{ask.line}</p>
        {ask.items.length > 0 && (
          <ul className="mt-3 grid gap-1.5 text-[14.5px] leading-relaxed text-foreground sm:grid-cols-2">
            {ask.items.map((i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true" className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {i}
              </li>
            ))}
          </ul>
        )}
        {privateSeats && state && pc && typeof pc === "object" && !Array.isArray(pc) && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[13.5px] font-semibold text-foreground">{state.state}'s official rules for private seats</p>
            <div className="mt-2">
              <Rows obj={pc} />
            </div>
          </div>
        )}
        {ask.after && <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">{ask.after}</p>}
        {stateLink && <p className="mt-3 text-[14px]">{stateLink}</p>}
      </section>
    );
  }

  if (row && row.status !== "not_verified") {
    const bond = collegeBondText(row);
    return (
      <section id="official-bond" className="scroll-mt-24 rounded-2xl border border-primary/25 bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
            <ScrollText className="h-5 w-5 text-primary" aria-hidden="true" /> PG bond at {name}
          </h2>
          <StatusChip status={row.status} />
        </div>
        {(

          <dl className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-[minmax(9rem,13rem)_1fr]">
            <dt className="text-[13px] font-semibold text-muted-foreground">Its own service bond</dt>
            <dd className="text-[15px] leading-relaxed text-foreground">
              <span className="font-semibold">{bond ?? "—"}</span>
              {row.what && bond !== row.what && <span className="mt-0.5 block text-[14px] text-muted-foreground">{row.what}</span>}
              {row.branches && <BranchAmounts branches={row.branches} />}
              {row.ifNotServed && !row.branches && <span className="mt-0.5 block text-[14px] text-muted-foreground">{row.ifNotServed}</span>}
            </dd>
            {row.leaving && (
              <>
                <dt className="text-[13px] font-semibold text-muted-foreground">Leaving the course</dt>
                <dd className="text-[15px] leading-relaxed text-foreground">{row.leaving}</dd>
              </>
            )}
            {row.deposit && (
              <>
                <dt className="text-[13px] font-semibold text-muted-foreground">Security deposit</dt>
                <dd className="text-[15px] leading-relaxed text-foreground">{row.deposit}</dd>
              </>
            )}
            {row.session && (
              <>
                <dt className="text-[13px] font-semibold text-muted-foreground">Session</dt>
                <dd className="text-[15px] leading-relaxed text-foreground">{row.session}</dd>
              </>
            )}
          </dl>
        )}
        {row.source && <Sources sources={[row.source]} className="mt-4 border-t border-border pt-4" />}
        {stateLink && <p className="mt-4 text-[14px]">{stateLink}</p>}
      </section>
    );
  }

  // A state government college with no row of its own: the state's rule.
  if (!state) return null;
  const g = govtBond(state!);
  const gsb = state!.data.government_service_bond;
  const applies = gsb && typeof gsb === "object" && !Array.isArray(gsb) && typeof gsb.applies_to === "string" ? gsb.applies_to : null;
  const line =
    g.flag === "not_notified"
      ? `${state!.state} has not notified a government service bond for this batch yet.`
      : g.flag === "lead"
        ? `${state!.state}'s government bond is not confirmed in an official notice yet: ask the college before you sign.`
        : [serviceYears(g), rangeText(g.min, g.max) ? `${rangeText(g.min, g.max)} if not served` : null]
            .filter(Boolean)
            .join(", ") || g.words || "As the state's rules print it.";
  return (
    <section id="official-bond" className="scroll-mt-24 rounded-2xl border border-primary/25 bg-card p-5 md:p-6">
      <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
        <ScrollText className="h-5 w-5 text-primary" aria-hidden="true" /> PG bond at {name}
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-foreground">
        <span className="font-semibold">{state!.state}'s government-college bond:</span> {line}
        {bindsAiq(state!) ? " It binds All India Quota seats here too." : ""}
      </p>
      {applies && g.flag !== "lead" && <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">Who it binds: {applies}</p>}
      {g.flag !== "lead" && gsb && typeof gsb === "object" && !Array.isArray(gsb) && <Sources sources={sourcesOf(gsb.source)} className="mt-4 border-t border-border pt-4" />}
      <p className="mt-4 text-[14px]">{stateLink}</p>
    </section>
  );
}
