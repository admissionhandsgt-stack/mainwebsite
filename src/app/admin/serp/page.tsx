import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { researchReport } from "@/lib/serpResearch";
import { webSearchUsage } from "@/lib/webSearch";
import { getTitleTestReport, type Half } from "@/lib/titleTestReport";
import { Badge, Card, EmptyState, PageHeader, Stats, TABLE } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/**
 * Search research (lib/serpResearch.ts): every hour, real searches from autocomplete and the searches Search Console
 * shows us for, studied with Tavily — where we stand, which page of ours answers, what the title lacks, the figures others
 * print with their sources, and the advice, best first. Figures are leads to check against the official source.
 */
const CONF: Record<string, "success" | "warning" | "neutral"> = { official: "success", agreed: "warning", single: "neutral" };

export default async function SerpResearchPage(props: { searchParams: Promise<{ kind?: string; days?: string }> }) {
  // A server page renders into the HTML before any client-side guard runs, so it checks the session itself.
  const user = await getSessionUser();
  if (!user) redirect("/admin");
  const sp = await props.searchParams;
  const days = [1, 7, 30].includes(Number(sp.days)) ? Number(sp.days) : 7;
  const kind = sp.kind === "gsc" || sp.kind === "suggest" ? sp.kind : null;

  const [{ rows: all, domains, pages, suggest }, usage, test] = await Promise.all([
    researchReport(days),
    webSearchUsage().catch(() => null),
    getTitleTestReport().catch(() => null),
  ]);
  const rows = kind ? all.filter((r) => r.kind === kind) : all;
  const inTop = all.filter((r) => r.our_rank != null).length;
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const half = (h: Half | null) =>
    h ? `${h.clicks.toLocaleString("en-IN")} clicks / ${h.impressions.toLocaleString("en-IN")} imp · CTR ${pct(h.ctr)} · pos ${h.position.toFixed(1)} · ${h.pages} pages` : "—";
  const link = (q: { days?: string; kind?: string | null }) => {
    const p = new URLSearchParams();
    p.set("days", q.days ?? String(days));
    const k = "kind" in q ? q.kind : kind;
    if (k) p.set("kind", k);
    return `?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search research"
        description="Every hour: real searches from Google and Bing autocomplete, and the searches Search Console shows us for, studied with a web search from India. Best first. Check any figure against its official source before it goes on a page."
      />
      <Stats
        items={[
          { label: `Searches studied (${days} d)`, value: all.length },
          { label: "We are in the web's top 10", value: `${inTop}`, tone: "success" },
          { label: "No page of ours answers", value: `${suggest.noPage}`, tone: suggest.noPage ? "warning" : "neutral" },
          { label: "Real searches collected", value: `${suggest.total}`, hint: `${suggest.today} new in 24 h` },
          { label: "Web searches this month", value: usage ? `${usage.used} / ${usage.budget}` : "—" },
        ]}
      />
      <div className="flex flex-wrap gap-2 text-sm">
        {[1, 7, 30].map((d) => (
          <a key={d} href={link({ days: String(d) })} className={`rounded-full px-3 py-1 font-semibold ring-1 ${d === days ? "bg-cyan-600 text-white ring-cyan-600" : "bg-white text-slate-700 ring-slate-200"}`}>
            {d === 1 ? "24 hours" : `${d} days`}
          </a>
        ))}
        <span className="mx-1 text-slate-300">|</span>
        {(
          [
            [null, "All"],
            ["gsc", "Search Console"],
            ["suggest", "Autocomplete"],
          ] as const
        ).map(([k, label]) => (
          <a key={label} href={link({ kind: k })} className={`rounded-full px-3 py-1 font-semibold ring-1 ${k === kind ? "bg-cyan-600 text-white ring-cyan-600" : "bg-white text-slate-700 ring-slate-200"}`}>
            {label}
          </a>
        ))}
      </div>

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
              <Badge tone={test.lift > 0 ? "success" : "warning"}>
                Figures half vs control: {test.lift > 0 ? "+" : ""}
                {test.lift.toFixed(1)}% CTR
              </Badge>
            )}
          </div>
        </Card>
      )}

      <Card title="What to do, best first" description="Priority weighs Search Console impressions (or how often autocomplete offers the search), a missing page and official figures we lack." flush>
        {rows.length === 0 ? (
          <EmptyState title="Nothing studied yet" hint="The hourly run fills this." />
        ) : (
          <div className={TABLE.wrap}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr>
                  <th className={TABLE.th}>Search</th>
                  <th className={TABLE.th}>Advice</th>
                  <th className={TABLE.th}>Figures found (sources)</th>
                  <th className={TABLE.th}>Web top 3</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 150).map((r) => (
                  <tr key={r.query} className={TABLE.row}>
                    <td className={`${TABLE.td} align-top`}>
                      <div className="font-medium text-slate-900">{r.query}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1 text-xs">
                        <Badge tone={r.kind === "suggest" ? "warning" : "neutral"}>{r.kind === "suggest" ? "autocomplete" : "Search Console"}</Badge>
                        {r.impressions != null && <Badge>{`${r.impressions} imp · #${Number(r.position).toFixed(1)}`}</Badge>}
                        <Badge tone={r.our_rank ? "success" : "neutral"}>{r.our_rank ? `web #${r.our_rank}` : "not in web top 10"}</Badge>
                        <Badge>{`priority ${Math.round(r.priority)}`}</Badge>
                      </div>
                      {r.page ? (
                        <a href={`https://www.admissionhands.com${r.page}`} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-cyan-700 hover:underline">
                          {r.page}
                        </a>
                      ) : (
                        <span className="mt-1 block text-xs text-amber-700">no page of ours</span>
                      )}
                      {r.answer && (
                        <details className="mt-1 text-xs text-slate-500">
                          <summary className="cursor-pointer">The web&apos;s answer</summary>
                          <p className="mt-1 whitespace-pre-line">{r.answer}</p>
                        </details>
                      )}
                    </td>
                    <td className={`${TABLE.td} align-top text-xs`}>
                      <ul className="space-y-1">
                        {r.advice.map((a, i) => (
                          <li key={i}>• {a.text}</li>
                        ))}
                      </ul>
                    </td>
                    <td className={`${TABLE.td} align-top text-xs`}>
                      <div className="flex max-w-[22rem] flex-wrap gap-1">
                        {r.facts.slice(0, 8).map((f) => (
                          <span key={f.fact} title={f.sources.join(", ")}>
                            <Badge tone={f.onOurPage ? "neutral" : CONF[f.confidence]}>
                              {f.onOurPage ? "✓ " : ""}
                              {f.fact} · {f.confidence}
                            </Badge>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={`${TABLE.td} align-top text-xs`}>
                      {r.results.slice(0, 3).map((x) => (
                        <div key={x.url}>
                          {x.rank}. {x.domain}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pages.length > 0 && (
        <Card title="By page" description="Where the searches land, and the searched words the page's title lacks most often." flush>
          <div className={TABLE.wrap}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr>
                  <th className={TABLE.th}>Page</th>
                  <th className={TABLE.th}>Searches</th>
                  <th className={TABLE.th}>Impressions</th>
                  <th className={TABLE.th}>Title lacks</th>
                  <th className={TABLE.th}>Figures others print</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.page} className={TABLE.row}>
                    <td className={`${TABLE.td} text-xs`}>
                      <a href={`https://www.admissionhands.com${p.page}`} target="_blank" rel="noreferrer" className="text-cyan-700 hover:underline">
                        {p.page}
                      </a>
                    </td>
                    <td className={`${TABLE.td} tabular-nums`}>{p.queries}</td>
                    <td className={`${TABLE.td} tabular-nums`}>{p.impressions}</td>
                    <td className={`${TABLE.td} text-xs`}>{p.noTitle.join(", ") || "—"}</td>
                    <td className={`${TABLE.td} tabular-nums`}>{p.facts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {domains.length > 0 && (
        <Card title="Who shows up most" description="Domains in the web's top 10 across the searches studied.">
          <div className="flex flex-wrap gap-2 p-4">
            {domains.map((d) => (
              <Badge key={d.domain} tone={/admissionhands/.test(d.domain) ? "success" : "neutral"}>
                {d.domain} · {d.n}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
