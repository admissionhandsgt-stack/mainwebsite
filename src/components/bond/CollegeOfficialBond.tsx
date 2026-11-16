import { ScrollText } from "lucide-react";
import Link from "@/components/ui/Link";
import { bindsAiq, govtBond, rangeText, yearsText, type OfficialCollege, type OfficialState, sourcesOf, serviceYears } from "@/lib/officialBond";
import { BranchAmounts, collegeBondText, Sources, StatusChip } from "@/components/bond/OfficialBond";

/**
 * "PG bond at <college>" on a PG college page (2026-11-16), above the seat-terms cards, anchored #official-bond. Either the
 * college's own row from the official file (its own notice; "ask the college" when not read yet), or — for a state
 * government college with no row of its own — its state's government bond, from the state's own rules. Either way it
 * replaces the third-party listing's bond and seat-leaving figures on this page (SeatTerms `hideBond`).
 */
export default function CollegeOfficialBond({
  name,
  row,
  state,
}: {
  name: string;
  row: OfficialCollege | null;
  state: OfficialState | null;
}) {
  if (!row && !state) return null;
  const stateLink = state ? (
    <Link href={`/md-ms-india/bond/${state.slug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
      {state.state}'s PG bond rules in full →
    </Link>
  ) : null;

  if (row) {
    const bond = collegeBondText(row);
    return (
      <section id="official-bond" className="scroll-mt-24 rounded-2xl border border-primary/25 bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
            <ScrollText className="h-5 w-5 text-primary" aria-hidden="true" /> PG bond at {name}
          </h2>
          <StatusChip status={row.status} />
        </div>
        {row.status === "not_verified" ? (
          <p className="mt-3 text-[15px] leading-relaxed text-foreground">
            This college's current PG documents have not been read yet, so no figure is shown here. Ask the college for its
            bond and course-leaving terms in writing before you sign or pay.{state ? " The state's own rules apply too." : ""}
          </p>
        ) : (
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
