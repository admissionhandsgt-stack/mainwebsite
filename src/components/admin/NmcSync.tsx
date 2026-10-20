"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Database, RefreshCw, Search, X } from "lucide-react";
import { Badge, Button, Card, EmptyState, INPUT, INPUT_H, Notice, PageHeader, Stats, TABLE, Tabs } from "@/components/admin/ui";
import type { NmcStatus, Unmatched } from "@/lib/nmcAdmin";

/**
 * Admin → Data sync: the NMC register (2026-10-18). A sync re-reads NMC's public
 * college-and-course search; most colleges pair with ours automatically, and the
 * rest wait here for a person — pick the right college, or say it is none of ours.
 * Decisions made here are never undone by a sync.
 */
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "—";

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/nmc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(j.error || `Failed (${res.status})`);
  return j;
}

function ManualPick({ row, onPicked }: { row: Unmatched; onPicked: (id: number) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: number; name: string; state: string | null }[]>([]);
  useEffect(() => {
    if (q.trim().length < 3) return setResults([]);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/nmc?find=${encodeURIComponent(q)}&level=${row.level}`);
      const j = (await res.json().catch(() => ({}))) as { results?: typeof results };
      setResults(j.results ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [q, row.level]);
  return (
    <div className="mt-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search our colleges by name…"
          aria-label={`Search our colleges for ${row.name}`}
          className={`${INPUT} ${INPUT_H} pl-9`}
        />
      </div>
      {results.length > 0 && (
        <ul className="mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onPicked(r.id)} className="block w-full px-3 py-2 text-left text-sm hover:bg-cyan-50">
                {r.name} <span className="text-slate-500">· {r.state ?? "—"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NmcSync() {
  const [data, setData] = useState<NmcStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"ug" | "pg">("ug");
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/nmc", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not load.");
      setData(j as NmcStatus);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    try {
      await post(body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(null);
    }
  };

  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (data?.unmatched ?? []).filter((u) => u.level === tab && (!f || `${u.name} ${u.state ?? ""}`.toLowerCase().includes(f)));
  }, [data, tab, filter]);

  const last = data?.runs[0];
  const lastOk = data?.runs.find((r) => r.status === "ok");

  return (
    <div>
      <PageHeader
        title="Data sync"
        description="The National Medical Commission's register of colleges and courses — ownership, university and approved seats for every MBBS, MD/MS and DM/M.Ch. course. College pages show it as the official record. It re-reads itself every week; sync now after NMC announces new seats."
        actions={
          <Button variant="primary" disabled={busy === "sync"} onClick={() => act("sync", { action: "sync" })}>
            <RefreshCw className={`h-4 w-4 ${busy === "sync" ? "animate-spin" : ""}`} />
            {busy === "sync" ? "Reading NMC… (about a minute)" : "Sync NMC now"}
          </Button>
        }
      />

      {error && (
        <Notice tone="danger" className="mb-4">
          {error}
        </Notice>
      )}
      {last?.status === "failed" && (
        <Notice tone="warning" className="mb-4" title="The last sync failed — the register before it is still in use.">
          {last.error}
        </Notice>
      )}

      {!data ? (
        <Card>
          <EmptyState icon={Database} title="Loading the register…" />
        </Card>
      ) : (
        <div className="space-y-6">
          <Stats
            items={[
              { label: "Colleges in NMC", value: n(data.totals.colleges), hint: `${n(data.totals.rows)} course rows` },
              { label: "MBBS colleges", value: n(data.totals.mbbsColleges), hint: `${n(data.totals.mbbsSeats)} seats` },
              {
                label: "Matched, MBBS",
                value: `${n(data.coverage.ugMatched)} / ${n(data.coverage.ugTotal)}`,
                tone: data.coverage.ugMatched / Math.max(1, data.coverage.ugTotal) > 0.9 ? "success" : "warning",
              },
              {
                label: "Matched, MD/MS",
                value: `${n(data.coverage.pgMatched)} / ${n(data.coverage.pgTotal)}`,
                tone: data.coverage.pgMatched / Math.max(1, data.coverage.pgTotal) > 0.9 ? "success" : "warning",
              },
              { label: "NMC updated", value: data.totals.updated ?? "—" },
              { label: "Last good sync", value: lastOk ? when(lastOk.finished_at) : "—" },
            ]}
          />

          <Card
            title="Colleges still to match"
            description="NMC colleges no college page shows yet. Pick ours — the suggestions are ranked by how alike the names are, same state only — or search; or mark one as none of ours (a new college we hold no counselling data for)."
            flush
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-3">
              <Tabs
                items={[
                  { id: "ug", label: "MBBS", count: data.unmatched.filter((u) => u.level === "ug").length },
                  { id: "pg", label: "MD/MS", count: data.unmatched.filter((u) => u.level === "pg").length },
                ]}
                value={tab}
                onChange={setTab}
              />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by name or state"
                aria-label="Filter colleges to match"
                className={`${INPUT} h-9 max-w-xs`}
              />
            </div>
            {rows.length === 0 ? (
              <EmptyState icon={Check} title="Nothing waiting here." hint="Every NMC college at this level is matched or set aside." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {rows.slice(0, 150).map((u) => {
                  const key = `${u.code}|${u.level}`;
                  return (
                    <li key={key} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{u.name}</p>
                          <p className="text-[13px] text-slate-500">
                            {u.state ?? "—"} · {u.management ?? "—"} · {n(u.seats)} {u.level === "ug" ? "MBBS" : "MD/MS"} seats · {u.code}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" disabled={busy === key} onClick={() => act(key, { action: "none", code: u.code, level: u.level })}>
                          <X className="h-3.5 w-3.5" /> None of ours
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {u.suggestions.map((s) => (
                          <Button
                            key={s.instituteId}
                            size="sm"
                            variant="secondary"
                            disabled={busy === key}
                            onClick={() => act(key, { action: "map", code: u.code, instituteId: s.instituteId })}
                            title="Match to this college"
                          >
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="max-w-[34ch] truncate">{s.name}</span>
                            <Badge tone={s.score >= 0.6 ? "success" : s.score >= 0.4 ? "warning" : "neutral"}>{Math.round(s.score * 100)}%</Badge>
                          </Button>
                        ))}
                        <Button size="sm" variant="ghost" onClick={() => setOpen(open === key ? null : key)}>
                          <Search className="h-3.5 w-3.5" /> {open === key ? "Close search" : "Search"}
                        </Button>
                      </div>
                      {open === key && (
                        <ManualPick row={u} onPicked={(id) => act(key, { action: "map", code: u.code, instituteId: id })} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {rows.length > 150 && <p className="px-5 pb-4 text-[13px] text-slate-500">Showing 150 of {rows.length}. Filter to find the rest.</p>}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="MBBS colleges by ownership" description="As NMC records it. NMC files deemed universities under Private.">
              <ul className="space-y-2">
                {data.byManagement.map((m) => (
                  <li key={m.management} className="flex items-baseline justify-between text-sm">
                    <span className="text-slate-700">{m.management}</span>
                    <span className="tabular-nums text-slate-900">
                      {n(m.colleges)} colleges · {n(m.seats)} seats
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Recent syncs" flush>
              <div className={TABLE.wrap}>
                <table className={TABLE.table}>
                  <thead className={TABLE.head}>
                    <tr>
                      <th className={TABLE.th}>When</th>
                      <th className={TABLE.th}>Result</th>
                      <th className={TABLE.th}>Rows</th>
                      <th className={TABLE.th}>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.runs.map((r) => (
                      <tr key={r.id} className={TABLE.row}>
                        <td className={TABLE.td}>{when(r.started_at)}</td>
                        <td className={TABLE.td}>
                          <Badge tone={r.status === "ok" ? "success" : r.status === "failed" ? "danger" : "info"}>{r.status}</Badge>
                        </td>
                        <td className={`${TABLE.td} tabular-nums`}>{n(r.rows)}</td>
                        <td className={`${TABLE.td} max-w-[16ch] truncate`}>{r.triggered_by ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {data.decided.length > 0 && (
            <Card title="Decided by hand" description="A sync never changes these. Undo one and the next sync may pair it automatically." flush>
              <ul className="divide-y divide-slate-100">
                {data.decided.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 text-slate-700">
                      <span className="font-medium text-slate-900">{d.name}</span> →{" "}
                      {d.method === "admin-none" ? (
                        <Badge>{d.level === "ug" ? "None of ours · MBBS" : d.level === "pg" ? "None of ours · MD/MS" : "None of ours"}</Badge>
                      ) : (
                        d.institute
                      )}
                    </span>
                    <Button size="sm" variant="ghost" disabled={busy === `undo${d.id}`} onClick={() => act(`undo${d.id}`, { action: "unmap", id: d.id })}>
                      Undo
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
