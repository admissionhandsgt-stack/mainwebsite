import Link from "@/components/ui/Link";
import type { BranchSeatsByState as Data } from "@/lib/branchSeatsByState";

const inr = (n: number) => n.toLocaleString("en-IN");

/**
 * A PG branch's seats in every state (lib/branchSeatsByState.ts) — one table on the branch page in place of a page per
 * branch × state. Every row carries an anchor (#seats-<state>) so a search for one state lands on its row; the state
 * links to the branch × state page where one exists, else the PG state page. Seat counts only — never a rank.
 */
export default function BranchSeatsByState({
  data,
  copy,
  slugOf,
  pairPage,
}: {
  data: Data;
  copy: Record<string, string>;
  /** Our PG state page slug for a state name, if we have one. */
  slugOf: Record<string, string>;
  /** States with a branch × state page for this branch: state name → its path. */
  pairPage: Record<string, string>;
}) {
  const hasMcc = data.rows.some((r) => r.mccMdms > 0);
  const hasDnb = data.rows.some((r) => r.mccDnb > 0);
  const hasGovt = data.rows.some((r) => r.nmcGovt > 0);
  return (
    <section className="mt-12" id="seats-by-state" aria-labelledby="seats-by-state-h">
      <h2 id="seats-by-state-h" className="font-heading text-xl font-bold text-foreground md:text-2xl">
        {copy.title}
      </h2>
      <p className="mt-1.5 max-w-[72ch] text-[14px] leading-relaxed text-muted-foreground">{copy.intro}</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="dt w-full text-[14px]">
          <thead>
            <tr>
              <th scope="col" className="text-left">{copy.col_state}</th>
              <th scope="col" className="text-right">{copy.col_nmc}</th>
              {hasGovt && <th scope="col" className="text-right">{copy.col_govt}</th>}
              {hasMcc && <th scope="col" className="text-right">{copy.col_mcc}</th>}
              {hasDnb && <th scope="col" className="text-right">{copy.col_dnb}</th>}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const slug = slugOf[r.state] ?? r.state.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
              const href = pairPage[r.state] ?? (slugOf[r.state] ? `/md-ms-india/states/${slugOf[r.state]}` : null);
              return (
                <tr key={r.state} id={`seats-${slug}`} className="scroll-mt-[calc(var(--site-top,112px)_+_1rem)]">
                  <th scope="row" className="text-left font-semibold text-foreground">
                    {href ? (
                      <Link href={href} className="hover:text-primary hover:underline">
                        {r.state}
                      </Link>
                    ) : (
                      r.state
                    )}
                  </th>
                  <td className="tnum text-right">
                    {r.nmcSeats > 0 ? (
                      <>
                        <span className="font-semibold text-foreground">{inr(r.nmcSeats)}</span>
                        <span className="block text-[11.5px] text-muted-foreground">{(copy.colleges || "{n} colleges").replace("{n}", inr(r.nmcColleges))}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  {hasGovt && <td className="tnum text-right">{r.nmcGovt > 0 ? inr(r.nmcGovt) : "—"}</td>}
                  {hasMcc && <td className="tnum text-right">{r.mccMdms > 0 ? inr(r.mccMdms) : "—"}</td>}
                  {hasDnb && <td className="tnum text-right">{r.mccDnb > 0 ? inr(r.mccDnb) : "—"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{copy.source}</p>
    </section>
  );
}
