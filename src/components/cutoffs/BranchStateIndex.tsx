import { Fragment } from "react";
import Link from "@/components/ui/Link";
import SectionHead from "@/components/ui/SectionHead";
import { BRANCH_STATE_COURSES, SEARCH_NAME, getBranchStateCombos, type BranchStateCombo } from "@/lib/branchStateQueries";

/**
 * The seven clinical branches, state by state (2026-11-09): every `/md-ms-india/branches/<branch>/<state>` page
 * linked from one block. On 8 Nov the Search Console index map had 68 of the 143 not indexed — 22 never
 * discovered — while the strongest PG pages (/neet-pg-cutoff, the branch index) linked none of them; they were
 * reachable only from their own branch page and the state pages. Running comma-separated links, not pills: as
 * pills the block was 2,337px tall on a 390px phone.
 */
export default async function BranchStateIndex({ className = "" }: { className?: string }) {
  const combos = await getBranchStateCombos().catch((): BranchStateCombo[] => []);
  if (combos.length === 0) return null;
  const groups = BRANCH_STATE_COURSES.map((course) => ({
    course,
    name: SEARCH_NAME[course] ?? course,
    states: combos.filter((c) => c.course === course),
  })).filter((g) => g.states.length > 0);

  return (
    <section className={`container-custom ${className}`} aria-labelledby="branch-by-state">
      <SectionHead
        icon="map"
        eyebrow="Branch × state"
        id="branch-by-state"
        title="Cut off, seats and fees: seven branches, state by state"
        intro="Each page: the last ranks admitted in the state by category and quota, MCC's seats there, the fee per quota, the stipend and the bond."
      />
      <div className="mt-6 gap-x-10 rounded-2xl border border-border bg-card p-4 md:p-6 lg:columns-2">
        {groups.map((g, gi) => (
          <div key={g.course} className={`break-inside-avoid ${gi < groups.length - 1 ? "pb-4" : ""}`}>
            <h3 className="font-heading text-[15px] font-bold text-foreground">
              <Link href={`/md-ms-india/branches/${g.states[0].courseSlug}`} className="hover:text-primary hover:underline">
                {g.name} cut off by state
              </Link>
            </h3>
            <p className="mt-1 text-[14px] leading-[1.9] text-muted-foreground">
              {g.states.map((s, i) => (
                <Fragment key={s.stateSlug}>
                  {/* nowrap on the name only: the ", " after it is where a line may break */}
                  <Link
                    href={`/md-ms-india/branches/${s.courseSlug}/${s.stateSlug}`}
                    className="whitespace-nowrap text-primary-strong hover:underline"
                  >
                    {s.state}
                  </Link>
                  {i < g.states.length - 1 ? ", " : ""}
                </Fragment>
              ))}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
