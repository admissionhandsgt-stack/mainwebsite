import { CheckCircle2 } from "lucide-react";
import { recentErrors } from "@/lib/logger";
import { Badge, Card, EmptyState, PageHeader, Stats, TABLE } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/**
 * What is failing in production.
 *
 * Grouped by fingerprint, so the same broken query five hundred times reads as
 * one row with a count — one thing to fix, not five hundred things to scroll.
 * Newest first, because the thing that broke most recently is the thing
 * somebody is hitting right now.
 */
export default async function LogsPage() {
  const groups = await recentErrors(60);
  const total = groups.reduce((n, g) => n + g.occurrences, 0);

  const when = (iso: string) => {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  };
  const stamp = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  // Long messages wrap, so cells sit at the top of the row rather than the
  // middle. Colour is set per column, so it is left out of the base class.
  const td = TABLE.td.replace("align-middle", "align-top").replace("text-slate-700", "");

  return (
    <div>
      <PageHeader
        title="Errors"
        description="Failures recorded on the live site in the last 30 days, grouped so each distinct problem is one row."
      />

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={CheckCircle2}
            title="Nothing has failed"
            hint="No errors in the last 30 days. If the site is live and busy, this staying empty is the good outcome — not a sign that logging is broken."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Stats
            items={[
              { label: "Distinct problems", value: groups.length.toLocaleString("en-IN"), tone: "warning" },
              { label: "Occurrences", value: total.toLocaleString("en-IN") },
              { label: "Most recent", value: when(groups[0].lastSeen) },
            ]}
          />

          <Card flush>
            <div className={TABLE.wrap}>
              <table className={`${TABLE.table} min-w-[640px]`}>
                <thead className={TABLE.head}>
                  <tr>
                    <th scope="col" className={TABLE.th}>Problem</th>
                    <th scope="col" className={TABLE.th}>Where</th>
                    <th scope="col" className={`${TABLE.th} text-right`}>Seen</th>
                    <th scope="col" className={`${TABLE.th} text-right`}>Last</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.fingerprint} className={TABLE.row}>
                      <td className={`${td} max-w-[520px]`}>
                        <div className="flex items-start gap-2">
                          <Badge tone={g.level === "warn" ? "warning" : "danger"} className="mt-0.5 shrink-0 uppercase">
                            {g.level}
                          </Badge>
                          {g.message.length > 220 ? (
                            // A failed query carries its whole SQL; three lines are enough to recognise it.
                            <details className="min-w-0 group">
                              <summary className="cursor-pointer list-none break-words font-mono text-[13px] text-slate-900">
                                <span className="line-clamp-3 group-open:line-clamp-none">{g.message}</span>
                                <span className="mt-1 inline-block text-xs font-sans font-semibold text-cyan-700 group-open:hidden">Show all</span>
                              </summary>
                            </details>
                          ) : (
                            <span className="min-w-0 break-words font-mono text-[13px] text-slate-900">{g.message}</span>
                          )}
                        </div>
                      </td>
                      <td className={`${td} font-mono text-xs text-slate-500`}>{g.route ?? "—"}</td>
                      <td className={`${td} text-right font-semibold tabular-nums text-slate-900`}>
                        {g.occurrences.toLocaleString("en-IN")}×
                      </td>
                      <td
                        className={`${td} whitespace-nowrap text-right text-xs text-slate-500`}
                        title={`First seen ${stamp(g.firstSeen)} · last seen ${stamp(g.lastSeen)}`}
                      >
                        {when(g.lastSeen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-slate-500">
        Errors are written to your own database, not to an outside service — there is no per-event
        bill and nobody else holds the data. IP addresses are stored only as a one-way hash, which
        is enough to tell whether two failures came from the same visitor and not enough to identify
        anyone. The one thing this cannot report is the site being completely down, since it would
        need the database to say so.
      </p>
    </div>
  );
}
