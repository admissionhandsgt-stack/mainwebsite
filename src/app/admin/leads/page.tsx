"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2, RefreshCw, Inbox, Search, Phone, Download, Trash2, X, CalendarClock, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { listRows, updateRow, deleteRow } from '@/lib/adminApi';
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { CLOSED, FOLLOW_TIMES, LEAD_STATUSES, OUTCOMES, statusLabel } from '@/lib/leadVocab';

/**
 * UG and PG enquiries live in one table, separated by `level`. Everything the
 * student submitted is read-only here — only the team's own columns (status,
 * owner, notes, follow-up) can be edited, so the record of what was actually
 * sent stays intact.
 *
 * `?view=unread|followup` and `?id=` come from the dashboard's links.
 */
interface Lead {
  id: number;
  level: 'ug' | 'pg' | null;
  name: string | null;
  phone: string;
  email: string | null;
  rank: number | null;
  category: string | null;
  preferred_branch: string | null;
  preferred_state: string | null;
  quota_interest: string | null;
  internship_status: string | null;
  attempt: string | null;
  budget_max: number | string | null;
  budget_total_max: number | string | null;
  mbbs_college: string | null;
  /** The full profile — migration 0029. */
  stream: string | null;
  neet_score: number | null;
  pwd: boolean | null;
  gender: string | null;
  domicile_state: string | null;
  preferred_states: string | null;
  college_types: string | null;
  seat_types: string | null;
  mbbs_state: string | null;
  service_quota: boolean | null;
  bond_ok: string | null;
  city: string | null;
  guardian_phone: string | null;
  options_seen: number | null;
  message: string | null;
  source_page: string | null;
  lead_status: string;
  is_read: boolean;
  assigned_to: string | null;
  admin_notes: string | null;
  follow_up_on: string | null;
  follow_up_time: string | null;
  follow_up_reminded_at: string | null;
  call_outcome: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

const STATUSES: string[] = [...LEAD_STATUSES];

const PILL: Record<string, string> = {
  New: 'bg-amber-50 text-amber-800 ring-amber-200',
  Contacted: 'bg-cyan-50 text-cyan-800 ring-cyan-200',
  Interested: 'bg-teal-50 text-teal-800 ring-teal-200',
  'Follow-up': 'bg-sky-50 text-sky-800 ring-sky-200',
  Converted: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  'Not interested': 'bg-slate-100 text-slate-600 ring-slate-200',
  'Wrong number': 'bg-slate-100 text-slate-600 ring-slate-200',
};
const pill = (s: string) => PILL[s] ?? PILL['Not interested'];

const STREAM: Record<string, string> = { mbbs: 'MBBS', bds: 'BDS', pg: 'MD/MS' };
const IST = 'Asia/Kolkata';
const PAGE = 50;

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleString('en-IN', { timeZone: IST, dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fmtShort = (v: string) => {
  const d = new Date(v);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: IST });
  return d.toLocaleDateString('en-CA', { timeZone: IST }) === today
    ? d.toLocaleTimeString('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short' });
};
const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: IST });
const isDue = (l: Lead) =>
  !!l.follow_up_on && String(l.follow_up_on).slice(0, 10) <= todayIso() && !CLOSED.includes(l.lead_status);

/** The budget ceiling, the way the team says it out loud. */
function budget(v: number | string | null): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 10000000) return `up to ₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `up to ₹${(n / 100000).toFixed(2)} L`;
  return `up to ₹${n.toLocaleString('en-IN')}`;
}
const yesNo = (v: boolean | null) => (v === null || v === undefined ? null : v ? 'Yes' : 'No');

type View = 'all' | 'unread' | 'followup' | (typeof STATUSES)[number];

export default function LeadsManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<'all' | 'ug' | 'pg'>('all');
  const [view, setView] = useState<View>('all');
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [wantId, setWantId] = useState<number | null>(null);

  // Deep links from the dashboard. Read once, from the address bar, so the
  // page needs no Suspense boundary for useSearchParams.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const v = p.get('view');
    if (v === 'unread' || v === 'followup' || STATUSES.includes(v ?? '')) setView(v as View);
    const id = Number(p.get('id'));
    if (id) setWantId(id);
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      setLeads(await listRows<Lead>('leads'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  /** Writes one change and keeps the row and the open panel in step. */
  const patch = async (lead: Lead, values: Partial<Lead>) => {
    try {
      await updateRow('leads', lead.id, values as Record<string, unknown>);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, ...values } : l)));
      setSelected((prev) => (prev && prev.id === lead.id ? { ...prev, ...values } : prev));
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save that change');
      return false;
    }
  };

  const open = (lead: Lead) => {
    setSelected(lead);
    setNotesDraft(lead.admin_notes ?? '');
    // Opening a lead is the moment it has been seen.
    if (!lead.is_read) patch(lead, { is_read: true });
  };

  useEffect(() => {
    if (!wantId || !leads.length) return;
    const l = leads.find((x) => x.id === wantId);
    if (l) open(l);
    setWantId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantId, leads]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    const ok = await patch(selected, { admin_notes: notesDraft });
    setSavingNotes(false);
    if (ok) toast.success('Notes saved');
  };

  const setStatus = async (lead: Lead, status: string) => {
    // Moving off "New" is the team saying they have reached out.
    const values: Partial<Lead> =
      status !== 'New' && !lead.last_contacted_at
        ? { lead_status: status, last_contacted_at: new Date().toISOString() }
        : { lead_status: status };
    if (await patch(lead, values)) toast.success(`Marked ${status}`);
  };

  const remove = async (lead: Lead) => {
    if (!window.confirm(`Delete the enquiry from ${lead.name || lead.phone}? This cannot be undone.`)) return;
    try {
      await deleteRow('leads', lead.id);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setSelected(null);
      toast.success('Lead deleted');
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const byLevel = useMemo(
    () => leads.filter((l) => level === 'all' || (l.level ?? 'ug') === level),
    [leads, level],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: byLevel.length, unread: 0, followup: 0 };
    for (const s of STATUSES) c[s] = 0;
    for (const l of byLevel) {
      if (!l.is_read) c.unread++;
      if (isDue(l)) c.followup++;
      c[l.lead_status] = (c[l.lead_status] ?? 0) + 1;
    }
    return c;
  }, [byLevel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return byLevel.filter((l) => {
      if (view === 'unread' && l.is_read) return false;
      if (view === 'followup' && !isDue(l)) return false;
      if (STATUSES.includes(view) && l.lead_status !== view) return false;
      if (!q) return true;
      return [
        l.name, l.phone, l.email, l.preferred_branch, l.preferred_state, l.preferred_states, l.domicile_state,
        l.city, l.attempt, l.mbbs_college, l.source_page, l.assigned_to, l.admin_notes,
        l.rank != null ? String(l.rank) : null,
      ].some((v) => v?.toLowerCase().includes(q));
    });
  }, [byLevel, query, view]);

  useEffect(() => setShown(PAGE), [query, view, level]);

  if (isLoading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const tabs: { id: View; label: string; tone?: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread', tone: 'amber' },
    { id: 'followup', label: 'Follow-up due', tone: 'amber' },
    ...STATUSES.map((s) => ({ id: s as View, label: statusLabel(s) })),
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">Every enquiry, what the student told us, and where the team has got to.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/leads/export"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
          <button
            onClick={fetchLeads}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Views */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2">
          {tabs.map((t) => {
            const active = view === t.id;
            const count = counts[t.id] ?? 0;
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'border-cyan-600 text-cyan-800' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                    t.tone === 'amber' && count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + level */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, rank, branch, state, notes…"
              aria-label="Search leads"
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5" role="group" aria-label="Course level">
            {(['all', 'pg', 'ug'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${level === l ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {l === 'all' ? 'All' : l === 'pg' ? 'PG' : 'UG'}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-slate-500 tabular-nums">
            {filtered.length} of {leads.length}
          </span>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Inbox className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              {leads.length === 0 ? 'No enquiries yet. They appear here the moment a form is submitted.' : 'Nothing matches this view.'}
            </p>
          </div>
        ) : (
          <>
          {/* Phones: one card per lead */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {filtered.slice(0, shown).map((l) => (
              <li key={l.id}>
                <button onClick={() => open(l)} className={`flex w-full items-start gap-3 px-4 py-3 text-left ${l.is_read ? '' : 'bg-amber-50/40'}`}>
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${l.is_read ? 'bg-transparent' : 'bg-amber-500'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${l.is_read ? 'font-medium' : 'font-semibold'} text-slate-900`}>{l.name || 'No name given'}</span>
                      <span className="shrink-0 text-xs text-slate-500">{fmtShort(l.created_at)}</span>
                    </span>
                    <span className="mt-0.5 block text-xs tabular-nums text-slate-500">
                      {l.phone} · {(l.stream && STREAM[l.stream]) || (l.level ?? 'ug').toUpperCase()}
                      {l.rank != null && ` · Rank ${l.rank.toLocaleString('en-IN')}`}
                      {l.category && ` ${l.category}`}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${pill(l.lead_status)}`}>{statusLabel(l.lead_status)}</span>
                      {isDue(l) && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700"><CalendarClock className="h-3 w-3" /> Follow-up due</span>}
                      {l.assigned_to && <span className="text-[11px] text-slate-500">{l.assigned_to}</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-3 py-2.5">Course</th>
                  <th className="px-3 py-2.5 text-right">Rank</th>
                  <th className="px-3 py-2.5">Looking for</th>
                  <th className="px-3 py-2.5">Owner</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Received</th>
                  <th className="px-4 py-2.5 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, shown).map((l) => {
                  const want = l.preferred_branch || l.preferred_states || l.preferred_state || l.domicile_state;
                  return (
                    <tr
                      key={l.id}
                      onClick={() => open(l)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${l.is_read ? '' : 'bg-amber-50/40'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${l.is_read ? 'bg-transparent' : 'bg-amber-500'}`} aria-label={l.is_read ? undefined : 'Unread'} />
                          <div className="min-w-0">
                            <div className={`truncate ${l.is_read ? 'font-medium' : 'font-semibold'} text-slate-900`}>{l.name || 'No name given'}</div>
                            <div className="text-xs tabular-nums text-slate-500">{l.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {(l.stream && STREAM[l.stream]) || (l.level ?? 'ug').toUpperCase()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-700">
                        {l.rank != null ? l.rank.toLocaleString('en-IN') : '—'}
                        {l.category && <div className="text-xs text-slate-400">{l.category}</div>}
                      </td>
                      <td className="max-w-[15rem] px-3 py-3">
                        <div className="truncate text-slate-700" title={want ?? ''}>{want || '—'}</div>
                        {l.source_page && <div className="truncate text-xs text-slate-400" title={l.source_page}>{l.source_page}</div>}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{l.assigned_to || <span className="text-slate-400">—</span>}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${pill(l.lead_status)}`}>{statusLabel(l.lead_status)}</span>
                        {l.follow_up_on && (
                          <div className={`mt-1 flex items-center gap-1 text-[11px] ${isDue(l) ? 'font-semibold text-amber-700' : 'text-slate-400'}`}>
                            <CalendarClock className="h-3 w-3" />
                            {new Date(String(l.follow_up_on).slice(0, 10) + 'T12:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-500">{fmtShort(l.created_at)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <a href={`tel:${l.phone}`} aria-label={`Call ${l.name || l.phone}`} className="rounded-lg p-2 text-slate-500 hover:bg-cyan-50 hover:text-cyan-700">
                            <Phone className="h-4 w-4" />
                          </a>
                          <a
                            href={`https://wa.me/${l.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`WhatsApp ${l.name || l.phone}`}
                            className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <WhatsAppIcon className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
            {filtered.length > shown && (
              <div className="border-t border-slate-100 p-3 text-center">
                <button
                  onClick={() => setShown((s) => s + PAGE)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ChevronDown className="h-4 w-4" /> Show {Math.min(PAGE, filtered.length - shown)} more
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Lead details">
          <button className="absolute inset-0 bg-slate-900/40" aria-label="Close" onClick={() => setSelected(null)} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-[34rem] flex-col bg-white shadow-2xl">
            <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold text-slate-900">{selected.name || 'No name given'}</h2>
                <p className="text-xs text-slate-500">
                  {(selected.stream && STREAM[selected.stream]) || (selected.level ?? 'ug').toUpperCase()} · received {fmtDate(selected.created_at)}
                </p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</h3>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(selected, s)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
                        selected.lead_status === s ? pill(s) : 'text-slate-500 ring-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {statusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>

              <Section title="Contact">
                <Field label="Phone" value={selected.phone} href={`tel:${selected.phone}`} />
                <Field label="Parent / guardian" value={selected.guardian_phone} href={selected.guardian_phone ? `tel:${selected.guardian_phone}` : undefined} />
                <Field label="Email" value={selected.email} href={selected.email ? `mailto:${selected.email}` : undefined} />
                <Field label="City" value={selected.city} />
                <Field label="Gender" value={selected.gender} />
              </Section>

              <Section title="NEET">
                <Field label="Rank" value={selected.rank != null ? selected.rank.toLocaleString('en-IN') : null} />
                <Field label="Score" value={selected.neet_score != null ? String(selected.neet_score) : null} />
                <Field label="Category" value={selected.category} />
                <Field label="PwD" value={yesNo(selected.pwd)} />
                <Field label="Attempt" value={selected.attempt} />
                <Field label="Domicile" value={selected.domicile_state} />
              </Section>

              <Section title="Looking for">
                <Field label="Branches" value={selected.preferred_branch} wide />
                <Field label="States" value={selected.preferred_states || selected.preferred_state} wide />
                <Field label="College types" value={selected.college_types} />
                <Field label="Seat types" value={selected.seat_types || selected.quota_interest} />
                <Field label="Budget a year" value={budget(selected.budget_max)} />
                <Field label="Budget in total" value={budget(selected.budget_total_max)} />
                <Field label="Options seen" value={selected.options_seen != null ? String(selected.options_seen) : null} />
              </Section>

              {(selected.mbbs_college || selected.mbbs_state || selected.internship_status || selected.service_quota !== null || selected.bond_ok) && (
                <Section title="PG background">
                  <Field label="MBBS from" value={selected.mbbs_college} wide />
                  <Field label="MBBS state" value={selected.mbbs_state} />
                  <Field label="Internship" value={selected.internship_status} />
                  <Field label="Service quota" value={yesNo(selected.service_quota)} />
                  <Field label="Bond" value={selected.bond_ok} />
                </Section>
              )}

              <Section title="Enquiry">
                <Field label="Came from" value={selected.source_page} wide />
                <Field label="Message" value={selected.message} wide />
              </Section>
              <p className="-mt-3 text-[11px] text-slate-400">Everything above is exactly as the student submitted it and cannot be edited.</p>

              <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Team</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-700">Assigned to</span>
                    <input
                      key={`a-${selected.id}`}
                      defaultValue={selected.assigned_to ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (selected.assigned_to ?? '')) patch(selected, { assigned_to: v || null });
                      }}
                      placeholder="Counsellor name"
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-700">Last call outcome</span>
                    <select
                      key={`o-${selected.id}`}
                      defaultValue={selected.call_outcome ?? ''}
                      onChange={(e) => patch(selected, { call_outcome: e.target.value || null })}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    >
                      <option value="">—</option>
                      {OUTCOMES.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-700">Follow up on</span>
                    <input
                      key={`f-${selected.id}`}
                      type="date"
                      defaultValue={selected.follow_up_on ? String(selected.follow_up_on).slice(0, 10) : ''}
                      onChange={(e) => patch(selected, { follow_up_on: e.target.value || null, follow_up_reminded_at: null })}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-700">At (WhatsApp reminder)</span>
                    <select
                      key={`t-${selected.id}`}
                      defaultValue={selected.follow_up_time ?? ''}
                      onChange={(e) => patch(selected, { follow_up_time: e.target.value || null, follow_up_reminded_at: null })}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    >
                      <option value="">No reminder</option>
                      {FOLLOW_TIMES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-700">Notes</span>
                  <textarea
                    rows={4}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="What was discussed, what was promised, what happens next."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Last contacted: {fmtDate(selected.last_contacted_at)}</span>
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes || notesDraft === (selected.admin_notes ?? '')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-40"
                  >
                    {savingNotes && <Loader2 className="h-4 w-4 animate-spin" />} Save notes
                  </button>
                </div>
              </div>
            </div>

            <footer className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
              <a
                href={`tel:${selected.phone}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"
              >
                <Phone className="h-4 w-4" /> Call
              </a>
              <a
                href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
              <button
                onClick={() => remove(selected)}
                aria-label="Delete this enquiry"
                className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  // A section whose every field is empty renders nothing at all.
  const any = React.Children.toArray(children).some(
    (c) => React.isValidElement<{ value?: string | null }>(c) && !!c.props.value,
  );
  if (!any) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-slate-50 p-4">{children}</dl>
    </div>
  );
}

function Field({ label, value, href, wide }: { label: string; value: string | null; href?: string; wide?: boolean }) {
  if (!value) return null;
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-semibold text-slate-900">
        {href ? (
          <a href={href} className="text-cyan-700 hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
