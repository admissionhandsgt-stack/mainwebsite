"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, FileText, Inbox, MessageCircle, RefreshCw,
  TrendingDown, TrendingUp, Minus, Bug, Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Num = number;

interface DashboardData {
  counts: Record<string, Num | string | null>;
  trend: { day: string; leads: Num; signups: Num }[];
  pipeline: { status: string; n: Num }[];
  sources: { source: string; n: Num }[];
  recent: {
    id: number;
    name: string | null;
    phone: string;
    level: string | null;
    rank: number | null;
    category: string | null;
    preferred_branch: string | null;
    source_page: string | null;
    lead_status: string;
    is_read: boolean;
    assigned_to: string | null;
    created_at: string;
  }[];
  health: Record<string, Num>;
}

/** Validated pair (dataviz validator, light surface): leads cyan, sign-ups orange. */
const LEADS = "#0891b2";
const SIGNUPS = "#eb6834";

const STAGES = ["New", "Contacted", "Interested", "Follow-up", "Converted", "Not interested", "Wrong number"];
const n = (v: unknown) => Number(v ?? 0).toLocaleString("en-IN");
const IST = "Asia/Kolkata";

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { timeZone: IST, hour: "2-digit", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function AdminDashboard() {
  const pathname = usePathname() ?? "";
  const { user } = useAuth();
  const base = pathname.startsWith("/admin") ? "/admin" : "";
  const to = (path: string) => `${base}${path}`;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not load");
      setData(await res.json());
      setUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 120_000);
    return () => clearInterval(i);
  }, [load]);

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">The dashboard didn&apos;t load</h1>
        <p className="mt-1.5 text-sm text-slate-600">{error}</p>
        <button onClick={load} className="mt-5 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">
          Try again
        </button>
      </div>
    );
  }

  if (!data) return <Skeleton />;

  const c = data.counts;
  const num = (k: string) => Number(c[k] ?? 0);
  const first = (user?.name || "").split(/\s+/)[0];

  const attention = [
    {
      show: num("unread_leads") > 0,
      icon: Inbox,
      tone: "amber",
      title: `${n(num("unread_leads"))} unread lead${num("unread_leads") === 1 ? "" : "s"}`,
      detail: c.oldest_unread ? `The oldest came in ${ago(String(c.oldest_unread))}` : "Waiting for a first look",
      href: to("/leads?view=unread"),
      cta: "Open leads",
    },
    {
      show: num("follow_ups_due") > 0,
      icon: CalendarClock,
      tone: "amber",
      title: `${n(num("follow_ups_due"))} follow-up${num("follow_ups_due") === 1 ? "" : "s"} due today or overdue`,
      detail: "Calls the team promised to make",
      href: to("/leads?view=followup"),
      cta: "See follow-ups",
    },
    {
      show: num("wa_unread") > 0,
      icon: MessageCircle,
      tone: "emerald",
      title: `${n(num("wa_unread"))} WhatsApp chat${num("wa_unread") === 1 ? "" : "s"} with an unread reply`,
      detail: "A typed reply is possible for 24 hours after their message",
      href: to("/whatsapp-log"),
      cta: "Open inbox",
    },
    {
      show: num("docs_pending") > 0,
      icon: FileText,
      tone: "amber",
      title: `${n(num("docs_pending"))} document${num("docs_pending") === 1 ? "" : "s"} to check`,
      detail: "Uploaded by candidates, not yet reviewed",
      href: to("/documents"),
      cta: "Review",
    },
    {
      show: num("wa_failed") + num("wa_no_receipt") > 0,
      icon: AlertTriangle,
      tone: "red",
      title: `${n(num("wa_failed"))} WhatsApp message${num("wa_failed") === 1 ? "" : "s"} failed, ${n(num("wa_no_receipt"))} with no receipt (24 h)`,
      detail: "If sign-in codes are not arriving, students cannot get in",
      href: to("/whatsapp-log"),
      cta: "Investigate",
    },
    {
      show: num("errors") > 0,
      icon: Bug,
      tone: "red",
      title: `${n(num("errors"))} server error${num("errors") === 1 ? "" : "s"} in the last 24 hours`,
      detail: "Grouped by cause on the errors screen",
      href: to("/logs"),
      cta: "View errors",
    },
  ].filter((a) => a.show);

  const delivered = num("codes_delivered");
  const sent = num("codes_sent");
  const deliveryRate = sent ? Math.round((delivered / sent) * 100) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting()}
            {first ? `, ${first}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-500">What is waiting on the team, and how this week is going.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {updated ? `Updated ${updated.toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" })}` : "Refresh"}
        </button>
      </div>

      {/* Needs attention */}
      <section aria-labelledby="attention-h" className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 id="attention-h" className="text-[15px] font-semibold text-slate-900">
            Needs attention
          </h2>
          <span className="text-xs text-slate-500">{attention.length ? `${attention.length} item${attention.length > 1 ? "s" : ""}` : ""}</span>
        </div>
        {attention.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-6 text-sm text-slate-600">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> All caught up — nothing is waiting on anyone.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {attention.map((a) => (
              <li key={a.title} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    a.tone === "red" ? "bg-red-50 text-red-600" : a.tone === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}
                >
                  <a.icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-semibold text-slate-900">{a.title}</div>
                  <div className="text-[13px] text-slate-500">{a.detail}</div>
                </div>
                <Link
                  href={a.href}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-slate-800"
                >
                  {a.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Key numbers">
        <Kpi label="Leads today" value={num("leads_today")} prev={num("leads_yesterday")} prevLabel="yesterday" />
        <Kpi label="Leads, last 7 days" value={num("leads_7")} prev={num("leads_prev_7")} prevLabel="the 7 days before" />
        <Kpi label="Verified sign-ups, 7 days" value={num("signups_7")} prev={num("signups_prev_7")} prevLabel="the 7 days before" />
        <div className={`min-w-0 rounded-2xl border bg-white p-4 sm:p-5 ${deliveryRate !== null && deliveryRate < 90 ? "border-red-200" : "border-slate-200"}`}>
          <div className="text-[13px] font-medium text-slate-500">Sign-in codes delivered, 24 h</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">{deliveryRate === null ? "—" : `${deliveryRate}%`}</span>
            <span className="text-sm text-slate-500 tabular-nums">
              {n(delivered)} of {n(sent)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {deliveryRate === null ? (
              <span className="text-slate-500">No codes sent in the last day</span>
            ) : deliveryRate >= 90 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" /> Students may not be getting codes
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Trend + breakdowns */}
      <section className="grid items-start gap-4 xl:grid-cols-3 [&>*]:min-w-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2">
          <TrendChart data={data.trend} />
        </div>
        <div className="min-w-0 space-y-4">
          <Breakdown
            title="Where leads are"
            rows={STAGES.map((s) => ({ label: s === "New" ? "Not contacted" : s, n: data.pipeline.find((p) => p.status === s)?.n ?? 0 }))}
            total={num("leads_total")}
            footer={num("stale_new") > 0 ? `${n(num("stale_new"))} still New after a day` : undefined}
          />
          <Breakdown title="Lead sources, 30 days" rows={data.sources.map((s) => ({ label: s.source, n: s.n }))} />
        </div>
      </section>

      {/* Latest leads */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-slate-900">Latest enquiries</h2>
          <Link href={to("/leads")} className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-800">
            All leads <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5">Student</th>
                <th className="px-3 py-2.5">Course</th>
                <th className="px-3 py-2.5 text-right">Rank</th>
                <th className="px-3 py-2.5">Came from</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recent.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={to(`/leads?id=${l.id}`)} className="flex items-center gap-2">
                      {!l.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-label="Unread" />}
                      <span>
                        <span className="block font-semibold text-slate-900 hover:text-cyan-700">{l.name || "No name given"}</span>
                        <span className="block text-xs tabular-nums text-slate-500">{l.phone}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{(l.level ?? "ug").toUpperCase()}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                    {l.rank != null ? n(l.rank) : "—"}
                    {l.category && <span className="ml-1 text-xs text-slate-400">{l.category}</span>}
                  </td>
                  <td className="max-w-[16rem] truncate px-3 py-3 text-slate-500" title={l.source_page ?? ""}>
                    {l.source_page || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill status={l.lead_status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-slate-500">{ago(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* What the site is running on */}
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">Data behind the site</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Closing ranks", data.health.closing_ranks],
            ["Seats tracked", data.health.seat_options],
            ["Institutes", data.health.institutes],
            ["Live alerts", data.health.alerts],
            ["Content blocks", data.health.blocks],
            ["Videos", data.health.videos],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums text-slate-900">{n(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function Kpi({ label, value, prev, prevLabel }: { label: string; value: number; prev: number; prevLabel: string }) {
  const diff = value - prev;
  const pct = prev > 0 ? Math.round((diff / prev) * 100) : null;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const tone = diff > 0 ? "text-emerald-700" : diff < 0 ? "text-red-700" : "text-slate-500";
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="text-[13px] font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">{n(value)}</div>
      <div className={`mt-2 flex items-center gap-1.5 text-xs ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
        <span>
          {diff === 0 ? "Same as" : `${diff > 0 ? "+" : ""}${n(diff)}${pct !== null ? ` (${pct > 0 ? "+" : ""}${pct}%)` : ""} vs`} {prevLabel}
        </span>
      </div>
    </div>
  );
}

const PILL: Record<string, string> = {
  New: "bg-amber-50 text-amber-800 ring-amber-200",
  Contacted: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  Interested: "bg-teal-50 text-teal-800 ring-teal-200",
  "Follow-up": "bg-sky-50 text-sky-800 ring-sky-200",
  Converted: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  "Not interested": "bg-slate-100 text-slate-600 ring-slate-200",
  "Wrong number": "bg-slate-100 text-slate-600 ring-slate-200",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${PILL[status] ?? PILL["Not interested"]}`}>
      {status === "New" ? "Not contacted" : status}
    </span>
  );
}

/** One series per row, one hue: identity is the label, magnitude is the bar. */
function Breakdown({ title, rows, total, footer }: { title: string; rows: { label: string; n: number }[]; total?: number; footer?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {total !== undefined && <span className="text-xs text-slate-500 tabular-nums">{n(total)} in all</span>}
      </div>
      <ul className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-slate-700" title={r.label}>
                {r.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-900">{n(r.n)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full" style={{ width: `${(r.n / max) * 100}%`, background: LEADS }} />
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-slate-500">Nothing yet.</li>}
      </ul>
      {footer && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
          <Clock className="h-3.5 w-3.5" /> {footer}
        </p>
      )}
    </div>
  );
}

/** 14 days of leads and verified sign-ups — same unit, one axis, grouped bars. */
function TrendChart({ data }: { data: { day: string; leads: number; signups: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => Math.max(4, ...data.flatMap((d) => [d.leads, d.signups])), [data]);
  const top = Math.ceil(max / 4) * 4;
  const ticks = [top, top / 2, 0];
  const label = (day: string, opts: Intl.DateTimeFormatOptions) => new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: IST, ...opts });
  const totals = data.reduce((a, d) => ({ leads: a.leads + d.leads, signups: a.signups + d.signups }), { leads: 0, signups: 0 });

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-slate-900">Last 14 days</h2>
        <div className="flex items-center gap-4 text-[13px] text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: LEADS }} /> Leads <b className="tabular-nums text-slate-900">{totals.leads}</b>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SIGNUPS }} /> Verified sign-ups{" "}
            <b className="tabular-nums text-slate-900">{totals.signups}</b>
          </span>
        </div>
      </div>

      <div className="relative mt-5 flex h-56 gap-3" onMouseLeave={() => setHover(null)}>
        <div className="flex w-6 flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-slate-400" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden="true">
            {ticks.map((t) => (
              <div key={t} className="border-t border-slate-100" />
            ))}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end">
            {data.map((d, i) => (
              <div
                key={d.day}
                className="relative flex h-full flex-1 items-end justify-center gap-[2px] px-[3px]"
                onMouseEnter={() => setHover(i)}
              >
                {hover === i && <div className="absolute inset-0 rounded-md bg-slate-100/70" />}
                <div className="relative w-full max-w-[14px] rounded-t-[4px]" style={{ height: `${(d.leads / top) * 100}%`, background: LEADS, minHeight: d.leads ? 3 : 0 }} />
                <div className="relative w-full max-w-[14px] rounded-t-[4px]" style={{ height: `${(d.signups / top) * 100}%`, background: SIGNUPS, minHeight: d.signups ? 3 : 0 }} />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
                    <div className="font-semibold">{label(d.day, { weekday: "short", day: "numeric", month: "short" })}</div>
                    <div className="mt-0.5 tabular-nums">
                      {d.leads} leads · {d.signups} sign-ups
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-6 items-end" aria-hidden="true">
            {data.map((d, i) => (
              <span key={d.day} className={`flex-1 text-center text-[11px] ${i % 2 ? "hidden sm:block" : ""} text-slate-400`}>
                {label(d.day, { day: "numeric" })}
              </span>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Leads and verified sign-ups per day, last 14 days</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Leads</th>
            <th>Sign-ups</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.leads}</td>
              <td>{d.signups}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}
