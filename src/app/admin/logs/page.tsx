import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { recentErrors } from "@/lib/logger";

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

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Errors</h1>
        <p className="mt-1 text-sm text-gray-500">
          Failures recorded on the live site in the last 30 days, grouped so each distinct problem
          is one row.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
          <h2 className="mt-3 text-base font-bold text-emerald-900">Nothing has failed</h2>
          <p className="mx-auto mt-1 max-w-[46ch] text-sm text-emerald-800">
            No errors in the last 30 days. If the site is live and busy, this staying empty is the
            good outcome — not a sign that logging is broken.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>{groups.length}</strong> distinct problem{groups.length === 1 ? "" : "s"},{" "}
              <strong>{total.toLocaleString("en-IN")}</strong> occurrence
              {total === 1 ? "" : "s"} in total.
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {["Problem", "Where", "Seen", "Last"].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 ${
                        i >= 2 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.fingerprint} className="border-t border-gray-100 align-top">
                    <td className="max-w-[420px] px-4 py-3">
                      <span
                        className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          g.level === "warn"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {g.level}
                      </span>
                      <span className="break-words font-mono text-[13px] text-gray-900">
                        {g.message}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-gray-500">
                      {g.route ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] font-semibold text-gray-900">
                      {g.occurrences.toLocaleString("en-IN")}×
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[12px] text-gray-500">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {when(g.lastSeen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="text-xs leading-relaxed text-gray-500">
        Errors are written to your own database, not to an outside service — there is no per-event
        bill and nobody else holds the data. IP addresses are stored only as a one-way hash, which
        is enough to tell whether two failures came from the same visitor and not enough to identify
        anyone. The one thing this cannot report is the site being completely down, since it would
        need the database to say so.
      </p>
    </div>
  );
}
