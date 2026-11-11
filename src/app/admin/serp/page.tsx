import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { researchReport } from "@/lib/serpResearch";
import { webSearchUsage } from "@/lib/webSearch";
import { getTitleTestReport, type Half } from "@/lib/titleTestReport";
import { Badge, Card, EmptyState, PageHeader, Stats, TABLE } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/**
 * Search research (lib/serpResearch.ts): for each search we are shown for at position 3–20, what the web answers,
 * where we stand among the top results, who else does, and the figures the answer states that our page does not print.
 * Those figures are leads to check against an official source before anything is added to a page.
 */
export default async function SerpResearchPage() {
  // A server page renders into the HTML before any client-side guard runs, so it checks the session itself.
  const user = await getSessionUser();
  if (!user) redirect("/admin");

  const [{ rows, domains }, usage, test] = await Promise.all([
    researchReport(30),
    webSearchUsage().catch(() => null),
    getTitleTestReport().catch(() => null),
  ]);
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const half = (h: Half | null) =>
    h ? `${h.clicks.toLocaleString("en-IN")} clicks / ${h.impressions.toLocaleString("en-IN")} imp · CTR ${pct(h.ctr)} · pos ${h.position.toFixed(1)} · ${h.pages} pages` : "—";
  const inTop = rows.filter((r) => r.our_rank != null).length;
  const withGaps = rows.filter((r) => r.missing.length).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search research"
        description="What the web answers for the searches Google shows us for (position 3–20), studied 15 a day with Tavily. Check a figure against its official source before it goes on a page."
      />
      <Stats
        items={[
          { label: "Searches studied (30 days)", value: rows.length },
          { label: "We are in the top 10", value: `${inTop}`, tone: "success" },
          { label: "Answer has figures our page lacks", value: `${withGaps}`, tone: withGaps ? "warning" : "neutral" },
          { label: "Web searches this month", value: usage ? `${usage.used} / ${usage.budget}` : "—" },
        ]}
      />

      {test && (
        <Card
          title="Title test: MD/MS college pages"
          description="Half the pages lead their title with a figure (fee, stipend, NIRF rank, seats); the other half keep the old title. Same weeks, so a change both halves share cancels out."
        >
          <div className="space-y-2 p-4 text-sm text-slate-700">
            <p className="text-slate-500">{test.note}</p>
            <p>
              <b>Before</b> ({test.before.from} – {test.before.to}) — control: {half(test.control.before)}; figures: {half(test.figures.before)}
            </p>
            {test.after && (
              <p>
                <b>After</b> ({test.after.from} – {test.after.to}) — control: {half(test.control.after)}; figures: {half(test.figures.after)}
              </p>
            )}
            {test.lift != null && (
              <p>
                <Badge tone={test.lift > 0 ? "success" : "warning"}>
                  Figures half vs control: {test.lift > 0 ? "+" : ""}
                  {test.lift.toFixed(1)}% CTR
                </Badge>
              </p>
            )}
          </div>
        </Card>
      )}

      {domains.length > 0 && (
        <Card title="Who shows up most" description="Domains in the top 10 across the searches studied.">
          <div className="flex flex-wrap gap-2 p-4">
            {domains.map((d) => (
              <Badge key={d.domain} tone={/admissionhands/.test(d.domain) ? "success" : "neutral"}>
                {d.domain} · {d.n}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card title="Search by search" description="Biggest first. Our position is Search Console's; 'top 10' is where the web search placed us." flush>
        {rows.length === 0 ? (
          <EmptyState title="Nothing studied yet" hint="The daily run fills this; the first one runs at 10:20 AM IST." />
        ) : (
          <div className={TABLE.wrap}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr>
                  <th className={TABLE.th}>Search</th>
                  <th className={TABLE.th}>Search Console</th>
                  <th className={TABLE.th}>Web top 10</th>
                  <th className={TABLE.th}>Who ranks first</th>
                  <th className={TABLE.th}>In the answer, not on our page</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.query} className={TABLE.row}>
                    <td className={`${TABLE.td} align-top`}>
                      <div className="font-medium text-slate-900">{r.query}</div>
                      {r.page && (
                        <a href={`https://www.admissionhands.com${r.page}`} target="_blank" rel="noreferrer" className="text-xs text-cyan-700 hover:underline">
                          {r.page}
                        </a>
                      )}
                      {r.answer && (
                        <details className="mt-1 text-xs text-slate-500">
                          <summary className="cursor-pointer">The web&apos;s answer</summary>
                          <p className="mt-1 whitespace-pre-line">{r.answer}</p>
                        </details>
                      )}
                    </td>
                    <td className={`${TABLE.td} align-top whitespace-nowrap`}>
                      #{r.position?.toFixed(1)} · {r.impressions} imp
                    </td>
                    <td className={`${TABLE.td} align-top`}>{r.our_rank ? <Badge tone="success">#{r.our_rank}</Badge> : <Badge tone="warning">not in top 10</Badge>}</td>
                    <td className={`${TABLE.td} align-top text-xs`}>
                      {r.results.slice(0, 3).map((x) => (
                        <div key={x.url}>
                          {x.rank}. {x.domain}
                        </div>
                      ))}
                    </td>
                    <td className={`${TABLE.td} align-top text-xs`}>{r.missing.length ? r.missing.join(", ") : <span className="text-slate-400">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
