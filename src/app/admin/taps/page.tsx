import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getSessionUser } from "@/lib/auth";
import { Badge, Card, EmptyState, PageHeader, Stats, TABLE } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/**
 * WhatsApp, call and Telegram taps by page (migration 0057, POST /api/tap): which pages start conversations. Content
 * pages convert through these taps, which never reach the leads table. Counts only — no number, no person.
 */
type Row = { path: string; whatsapp: number; call: number; telegram: number; total: number; prev: number };
type Place = { placement: string; kind: string; n: number };

export default async function TapsPage(props: { searchParams: Promise<{ days?: string }> }) {
  // A server page renders into the HTML before any client-side guard runs, so it checks the session itself.
  const user = await getSessionUser();
  if (!user) redirect("/admin");
  const sp = await props.searchParams;
  const days = [7, 14, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 14;

  let rows: Row[] = [];
  let places: Place[] = [];
  let daily: { day: string; n: number }[] = [];
  let missing = false;
  try {
    rows = (await db.execute(sql`
      WITH t AS (SELECT * FROM cta_taps WHERE day > (now() AT TIME ZONE 'Asia/Kolkata')::date - ${days * 2}::int)
      SELECT path,
             SUM(n) FILTER (WHERE kind = 'whatsapp' AND day > (now() AT TIME ZONE 'Asia/Kolkata')::date - ${days}::int)::int AS whatsapp,
             SUM(n) FILTER (WHERE kind = 'call' AND day > (now() AT TIME ZONE 'Asia/Kolkata')::date - ${days}::int)::int AS call,
             SUM(n) FILTER (WHERE kind = 'telegram' AND day > (now() AT TIME ZONE 'Asia/Kolkata')::date - ${days}::int)::int AS telegram,
             SUM(n) FILTER (WHERE day > (now() AT TIME ZONE 'Asia/Kolkata')::date - ${days}::int)::int AS total,
             SUM(n) FILTER (WHERE day <= (now() AT TIME ZONE 'Asia/Kolkata')::date - ${days}::int)::int AS prev
        FROM t GROUP BY path
      HAVING SUM(n) FILTER (WHERE day > (now() AT TIME ZONE 'Asia/Kolkata')::date - ${days}::int) > 0
       ORDER BY total DESC LIMIT 100`)) as unknown as Row[];
    places = (await db.execute(sql`
      SELECT placement, kind, SUM(n)::int AS n FROM cta_taps
       WHERE day > (now() AT TIME ZONE 'Asia/Kolkata')::date - ${days}::int
       GROUP BY placement, kind ORDER BY n DESC LIMIT 40`)) as unknown as Place[];
    daily = (await db.execute(sql`
      SELECT day::text, SUM(n)::int AS n FROM cta_taps
       WHERE day > (now() AT TIME ZONE 'Asia/Kolkata')::date - ${days}::int
       GROUP BY day ORDER BY day`)) as unknown as { day: string; n: number }[];
  } catch {
    missing = true;
  }
  const sum = (k: keyof Row) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Taps by page"
        description="Every tap on a WhatsApp, call or Telegram link, counted by the page it happened on. Counts only — never the number or the person."
      />
      <div className="flex flex-wrap gap-2 text-sm">
        {[7, 14, 30, 90].map((d) => (
          <a key={d} href={`?days=${d}`} className={`rounded-full px-3 py-1 font-semibold ring-1 ${d === days ? "bg-cyan-600 text-white ring-cyan-600" : "bg-white text-slate-700 ring-slate-200"}`}>
            {d} days
          </a>
        ))}
      </div>
      <Stats
        items={[
          { label: `WhatsApp taps (${days} days)`, value: sum("whatsapp"), tone: "success" },
          { label: "Call taps", value: sum("call") },
          { label: "Telegram taps", value: sum("telegram") },
          { label: `The ${days} days before`, value: sum("prev"), hint: "all kinds" },
        ]}
      />

      {daily.length > 0 && (
        <Card title="By day" description="All kinds together, IST.">
          <div className="flex flex-wrap gap-2 p-4 text-xs">
            {daily.map((d) => (
              <span key={d.day} className="rounded-md bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
                {d.day.slice(5)} · <b className="tabular-nums">{d.n}</b>
              </span>
            ))}
          </div>
        </Card>
      )}

      {places.length > 0 && (
        <Card title="Which button" description="The link's placement on the page (data-placement).">
          <div className="flex flex-wrap gap-2 p-4">
            {places.map((p) => (
              <Badge key={`${p.placement}|${p.kind}`} tone={p.kind === "whatsapp" ? "success" : "neutral"}>
                {p.placement} · {p.kind} · {p.n}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card title="Pages" description="Most taps first. 'Before' is the same number of days just before." flush>
        {missing || rows.length === 0 ? (
          <EmptyState title={missing ? "The taps table is not there yet" : "No taps yet"} hint={missing ? "Apply migration 0057." : "Counting started on 11 Nov 2026."} />
        ) : (
          <div className={TABLE.wrap}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr>
                  <th className={TABLE.th}>Page</th>
                  <th className={TABLE.th}>WhatsApp</th>
                  <th className={TABLE.th}>Call</th>
                  <th className={TABLE.th}>Telegram</th>
                  <th className={TABLE.th}>Total</th>
                  <th className={TABLE.th}>Before</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.path} className={TABLE.row}>
                    <td className={TABLE.td}>
                      <a href={`https://www.admissionhands.com${r.path}`} target="_blank" rel="noreferrer" className="text-cyan-700 hover:underline">
                        {r.path}
                      </a>
                    </td>
                    <td className={`${TABLE.td} tabular-nums`}>{r.whatsapp ?? 0}</td>
                    <td className={`${TABLE.td} tabular-nums`}>{r.call ?? 0}</td>
                    <td className={`${TABLE.td} tabular-nums`}>{r.telegram ?? 0}</td>
                    <td className={`${TABLE.td} font-semibold tabular-nums`}>{r.total}</td>
                    <td className={`${TABLE.td} tabular-nums text-slate-500`}>{r.prev ?? 0}</td>
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
