import { Bell, ExternalLink } from "lucide-react";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getLiveAlerts, type LiveAlert } from "@/lib/content";
import { getStateNotices, type StateNotice } from "@/lib/stateNotices";

/**
 * "Latest counselling updates for you" on /account (2026-11-10; owner: the account's benefits should include "latest
 * updates"). MCC's and the national bodies' newest notices for the student's level (from the alerts bar), and the
 * newest notices of their home state's counselling authority (lib/stateNotices.ts) — the same official notices the site
 * already shows, picked for this student. Server component.
 */
const PG = /\b(pg|md|ms|dnb|mds|ss|neet[- ]pg|post ?graduate|diploma)\b/i;
const UG = /\b(ug|mbbs|bds|neet[- ]ug|undergraduate)\b/i;

export default async function AccountUpdates({ userId, level }: { userId: number; level: "ug" | "pg" }) {
  const domicile = (
    (await db.execute(sql`SELECT domicile_state AS d FROM users WHERE id = ${userId}`).catch(() => [])) as unknown as { d: string | null }[]
  )[0]?.d ?? null;
  const [alerts, state] = await Promise.all([
    getLiveAlerts().catch((): LiveAlert[] => []),
    domicile ? getStateNotices(domicile, level, 4).catch((): StateNotice[] => []) : Promise.resolve([] as StateNotice[]),
  ]);
  const national = alerts
    .filter((a) => (level === "pg" ? PG.test(a.title) && !(UG.test(a.title) && !PG.test(a.title)) : UG.test(a.title) || !PG.test(a.title)))
    .slice(0, 5);
  if (!national.length && !state.length) return null;
  const item = (title: string, url: string | null, note?: string) => (
    <li key={`${title}-${url}`} className="flex items-start gap-2.5 py-2">
      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-strong" />
      <span className="min-w-0 text-[14px] leading-relaxed text-foreground">
        {url ? (
          <a href={url} target={url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="hover:text-primary-strong hover:underline">
            {title}
            {!url.startsWith("/") && <ExternalLink className="ml-1 inline h-3 w-3 align-baseline text-muted-foreground" aria-hidden />}
          </a>
        ) : (
          title
        )}
        {note && <span className="block text-[12px] text-muted-foreground">{note}</span>}
      </span>
    </li>
  );
  return (
    <section className="rounded-2xl border border-border bg-card p-6 md:col-span-2">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
        <Bell className="h-4 w-4 text-primary-strong" aria-hidden /> Latest counselling updates for you
      </h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {level === "pg" ? "NEET PG (MD/MS, DNB)" : "NEET UG (MBBS, BDS)"}
        {domicile ? ` · MCC and ${domicile}` : " · MCC and the national bodies"} — official notices, newest first.
      </p>
      <div className={`mt-3 grid gap-6 ${state.length && national.length ? "md:grid-cols-2" : ""}`}>
        {national.length > 0 && (
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">All India</p>
            <ul className="divide-y divide-border">{national.map((a) => item(a.title, a.link))}</ul>
          </div>
        )}
        {state.length > 0 && (
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">{domicile}</p>
            <ul className="divide-y divide-border">
              {state.map((n) => item(n.title, n.url, [n.authority, new Date(n.on).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })].filter(Boolean).join(" · ")))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
