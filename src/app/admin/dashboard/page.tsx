"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Inbox, AlertTriangle, Database, FileText, Image as ImageIcon,
  MapPin, Layers, Bell, Video, Settings, ArrowRight, RefreshCw,
} from "lucide-react";

interface Lead {
  id: number;
  name: string | null;
  phone: string;
  level: string | null;
  rank: number | null;
  preferred_branch: string | null;
  source_page: string | null;
  lead_status: string;
  is_read: boolean;
  created_at: string;
}

interface Dashboard {
  leads: {
    total: number; unread: number; today: number; week: number;
    recent: Lead[];
    byDay: { day: string; n: number }[];
  };
  content: Record<string, number>;
  colleges: { ug: number; pg: number; deemed: number };
  counselling: { closingRanks: number; seatOptions: number; institutes: number; ugRanks: number };
}

const n = (v: number) => v.toLocaleString("en-IN");

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not load");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">The dashboard didn&apos;t load</h1>
        <p className="mt-1.5 text-sm text-slate-600">{error}</p>
        <button
          onClick={load}
          className="mt-5 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-cyan-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const peak = Math.max(1, ...data.leads.byDay.map((d) => d.n));

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            What needs attention, and what is live on the site right now.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-cyan-300 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Leads — the only thing here that is time-sensitive */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/leads"
            className={`rounded-2xl border p-5 transition-colors ${
              data.leads.unread > 0
                ? "border-amber-300 bg-amber-50 hover:border-amber-400"
                : "border-slate-200 bg-white hover:border-cyan-300"
            }`}
          >
            <div className="flex items-center gap-2 text-slate-500">
              <Inbox className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Unread leads</span>
            </div>
            <div className={`mt-2 text-3xl font-extrabold ${data.leads.unread > 0 ? "text-amber-700" : "text-slate-900"}`}>
              {n(data.leads.unread)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {data.leads.unread > 0 ? "Waiting for a first reply" : "Everything has been seen"}
            </div>
          </Link>

          {[
            { label: "Leads today", value: data.leads.today },
            { label: "Last 7 days", value: data.leads.week },
            { label: "All time", value: data.leads.total },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">{n(s.value)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 14-day lead trend */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-900">Leads, last 14 days</h2>
        <div className="mt-5 flex h-32 items-end gap-1.5">
          {data.leads.byDay.map((d) => (
            <div key={d.day} className="group relative flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t bg-cyan-500/80 transition-colors group-hover:bg-cyan-600"
                style={{ height: `${Math.max(3, (d.n / peak) * 100)}%` }}
              />
              <span className="text-[10px] text-slate-400">{d.day.slice(8)}</span>
              <span className="pointer-events-none absolute -top-7 hidden rounded bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">
                {d.n} on {d.day.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent leads */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">Latest enquiries</h2>
          <Link href="/admin/leads" className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700">
            All leads <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {data.leads.recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No enquiries yet. They appear here the moment a form is submitted.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.leads.recent.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                {!l.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
                <span className="font-semibold text-slate-900">{l.name || "No name given"}</span>
                <span className="text-sm text-slate-500">{l.phone}</span>
                {l.rank != null && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    Rank {n(l.rank)}
                  </span>
                )}
                {l.preferred_branch && (
                  <span className="text-xs text-slate-500">{l.preferred_branch}</span>
                )}
                <span className="ml-auto text-xs text-slate-400">
                  {new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* What is live */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-900">What is live on the site</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/admin/content", icon: Settings, label: "Editable text", value: data.content.settings, unit: "settings" },
            { href: "/admin/content", icon: Layers, label: "Content blocks", value: data.content.blocks, unit: "items" },
            { href: "/admin/live-alerts", icon: Bell, label: "Active alerts", value: data.content.alerts, unit: "" },
            { href: "/admin/videos", icon: Video, label: "Videos", value: data.content.videos, unit: "" },
            { href: "/admin/media", icon: ImageIcon, label: "Images", value: data.content.media, unit: "" },
            { href: "/admin/mbbs-states", icon: MapPin, label: "State pages", value: data.content.states, unit: "" },
            { href: "/admin/pg-branches", icon: Layers, label: "PG branches", value: data.content.branches, unit: "" },
            { href: "/admin/colleges", icon: FileText, label: "UG colleges", value: data.colleges.ug, unit: "" },
          ].map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-cyan-300"
            >
              <div className="flex items-center gap-2 text-slate-400">
                <c.icon className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">{c.label}</span>
              </div>
              <div className="mt-1.5 text-2xl font-bold text-slate-900">{n(c.value)}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Counselling data health */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">Counselling data</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            { label: "Closing ranks", value: data.counselling.closingRanks },
            { label: "Seats tracked", value: data.counselling.seatOptions },
            { label: "Institutes", value: data.counselling.institutes },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-slate-900">{n(s.value)}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
          <div>
            <div className={`text-2xl font-bold ${data.counselling.ugRanks === 0 ? "text-amber-600" : "text-slate-900"}`}>
              {n(data.counselling.ugRanks)}
            </div>
            <div className="text-xs text-slate-500">UG closing ranks</div>
          </div>
        </div>
        {data.counselling.ugRanks === 0 && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            No UG closing ranks are loaded, so the MBBS predictor and cutoff pages have nothing to show.
            The PG data is complete. Run the import once the UG extract is available.
          </p>
        )}
      </section>
    </div>
  );
}
