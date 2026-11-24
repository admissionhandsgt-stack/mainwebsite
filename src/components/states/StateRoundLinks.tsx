import Link from "@/components/ui/Link";
import { pageCopy } from "@/lib/pageCopy";
import { getStateRoundLinks } from "@/lib/stateRoundPages";

/**
 * "<State> NEET PG 2026, round by round: Round 1 result · Round 2" — the state's own round pages
 * (/neet-pg-counselling/<year>/<round>/<state>, lib/stateRoundPages.ts), linked from the state's data and counselling
 * pages under its latest notices. Renders nothing for a state with no round page.
 * Words: Admin → Content → "Page: a state's NEET PG round (result, merit list, seat matrix)".
 */
export default async function StateRoundLinks({ state }: { state: string }) {
  const { year, entries } = await getStateRoundLinks(state).catch(() => ({ year: 0, entries: [] }));
  if (!entries.length) return null;
  const c = await pageCopy("page.pg_state_round", { state, year });
  const word = (order: number) => (order === 4 ? "Stray vacancy round" : `Round ${order}`);
  return (
    <section className="container-custom pt-4" aria-label={`${state} NEET PG rounds`}>
      <p className="rounded-2xl border border-border bg-card px-4 py-3 text-[14.5px] leading-relaxed">
        <span className="font-semibold text-foreground">{c.rounds_line}</span>{" "}
        {entries.map((e, i) => (
          <span key={e.path}>
            {i > 0 && <span className="text-muted-foreground"> · </span>}
            <Link href={e.path} className="font-semibold text-primary-strong hover:underline dark:text-primary">
              {word(e.order)}
              {e.results > 0 || e.figures ? " result" : ""}
            </Link>
          </span>
        ))}
      </p>
    </section>
  );
}
