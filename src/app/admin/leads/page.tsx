"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2, RefreshCw, Inbox, Search, Phone, Mail, Award, Download,
  Trash2, Eye, EyeOff, X, CalendarClock, User, MapPin, FileText,
  MessageSquare, Stethoscope,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { listRows, updateRow, deleteRow } from '@/lib/adminApi';

/**
 * UG and PG enquiries live in one table, separated by `level`. Everything the
 * student submitted is read-only here — only the team's own columns (status,
 * owner, notes, follow-up) can be edited, so the record of what was actually
 * sent stays intact.
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
  message: string | null;
  source_page: string | null;
  lead_status: string;
  is_read: boolean;
  assigned_to: string | null;
  admin_notes: string | null;
  follow_up_on: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

const STATUSES = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];

const STATUS_STYLE: Record<string, string> = {
  New: 'bg-amber-100 text-amber-800 border-amber-200',
  Contacted: 'bg-sky-100 text-sky-800 border-sky-200',
  Qualified: 'bg-violet-100 text-violet-800 border-violet-200',
  Converted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Lost: 'bg-gray-100 text-gray-600 border-gray-200',
};

const statusClass = (s: string) => STATUS_STYLE[s] ?? 'bg-gray-100 text-gray-600 border-gray-200';

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const fmtDay = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** A read-only field from the submission. */
function Detail({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
        {href ? (
          <a href={href} className="break-words text-sm font-semibold text-medical-700 hover:underline">
            {value}
          </a>
        ) : (
          <div className="break-words text-sm font-semibold text-gray-900">{value}</div>
        )}
      </div>
    </div>
  );
}

export default function LeadsManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'ug' | 'pg'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

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
    if (!window.confirm(`Delete the enquiry from ${lead.name || lead.phone}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteRow('leads', lead.id);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setSelected(null);
      toast.success('Lead deleted');
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (levelFilter !== 'all' && (l.level ?? 'ug') !== levelFilter) return false;
      if (statusFilter !== 'all' && l.lead_status !== statusFilter) return false;
      if (unreadOnly && l.is_read) return false;
      if (!q) return true;
      return [
        l.name, l.phone, l.email, l.preferred_branch, l.preferred_state,
        l.source_page, l.assigned_to, l.admin_notes,
        l.rank != null ? String(l.rank) : null,
      ].some((v) => v?.toLowerCase().includes(q));
    });
  }, [leads, query, levelFilter, statusFilter, unreadOnly]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      total: leads.length,
      unread: leads.filter((l) => !l.is_read).length,
      today: leads.filter((l) => new Date(l.created_at) >= today).length,
      dueFollowUp: leads.filter(
        (l) => l.follow_up_on && new Date(l.follow_up_on) <= new Date(),
      ).length,
    };
  }, [leads]);

  if (isLoading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
          <p className="mt-1 text-sm text-gray-500">
            Everything a student submitted, and where the team has got to with it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/leads/export"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
          <button
            onClick={fetchLeads}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Counts, with the ones needing action first */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => setUnreadOnly((v) => !v)}
          className={`rounded-2xl border p-4 text-left transition-colors ${
            unreadOnly
              ? 'border-amber-400 bg-amber-50'
              : stats.unread > 0
                ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unread</div>
          <div className={`mt-1 text-2xl font-extrabold ${stats.unread > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
            {stats.unread}
          </div>
          <div className="mt-0.5 text-[11px] text-gray-500">
            {unreadOnly ? 'Showing unread only — tap to clear' : 'Tap to filter'}
          </div>
        </button>
        {[
          { label: 'Today', value: stats.today },
          { label: 'Follow-up due', value: stats.dueFollowUp },
          { label: 'All time', value: stats.total },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{s.label}</div>
            <div className="mt-1 text-2xl font-extrabold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, phone, email, branch, notes…"
            aria-label="Search enquiries"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-medical-500"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as 'all' | 'ug' | 'pg')}
          aria-label="Filter by level"
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-medical-500"
        >
          <option value="all">All levels</option>
          <option value="pg">PG (MD/MS)</option>
          <option value="ug">UG (MBBS)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-medical-500"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <span className="ml-auto text-xs text-gray-500">
          {filtered.length} of {leads.length}
        </span>
      </div>

      {/* The list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center">
          <Inbox className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {leads.length === 0
              ? 'No enquiries yet. They appear here the moment a form is submitted.'
              : 'No enquiry matches these filters.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((lead) => (
            <li key={lead.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => open(lead)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open(lead);
                  }
                }}
                className={`flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-white px-4 py-3.5 transition-colors hover:border-medical-300 ${
                  lead.is_read ? 'border-gray-200' : 'border-amber-200 bg-amber-50/40'
                }`}
              >
                {!lead.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />}

                <div className="min-w-[10rem] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-gray-900">{lead.name || 'No name given'}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                      {lead.level ?? 'ug'}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span>{lead.phone}</span>
                    {lead.rank != null && <span>Rank {lead.rank.toLocaleString('en-IN')}</span>}
                    {lead.preferred_branch && <span>{lead.preferred_branch}</span>}
                  </div>
                </div>

                {lead.assigned_to && (
                  <span className="hidden rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 sm:inline">
                    {lead.assigned_to}
                  </span>
                )}

                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClass(lead.lead_status)}`}
                >
                  {lead.lead_status}
                </span>

                <span className="w-32 shrink-0 text-right text-[11px] text-gray-400">
                  {new Date(lead.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>

                <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => patch(lead, { is_read: !lead.is_read })}
                    aria-label={lead.is_read ? 'Mark unread' : 'Mark read'}
                    title={lead.is_read ? 'Mark unread' : 'Mark read'}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    {lead.is_read ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => remove(lead)}
                    aria-label="Delete"
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-[30rem] flex-col border-l border-gray-200 bg-white shadow-2xl"
              aria-label="Enquiry details"
            >
              <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-gray-900">
                    {selected.name || 'No name given'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Received {fmtDate(selected.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                {/* Status */}
                <div>
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Status
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(selected, s)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                          selected.lead_status === s
                            ? statusClass(s)
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* What they sent — read only */}
                <div>
                  <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    What they submitted
                  </h3>
                  <div className="space-y-3.5 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                    <Detail icon={Phone} label="Phone" value={selected.phone} href={`tel:${selected.phone}`} />
                    <Detail icon={Mail} label="Email" value={selected.email} href={selected.email ? `mailto:${selected.email}` : undefined} />
                    <Detail icon={Award} label="Rank" value={selected.rank != null ? selected.rank.toLocaleString('en-IN') : null} />
                    <Detail icon={User} label="Category" value={selected.category} />
                    <Detail icon={Stethoscope} label="Preferred branch" value={selected.preferred_branch} />
                    <Detail icon={MapPin} label="Preferred state" value={selected.preferred_state} />
                    <Detail icon={FileText} label="Quota interest" value={selected.quota_interest} />
                    <Detail icon={FileText} label="Internship status" value={selected.internship_status} />
                    <Detail icon={MessageSquare} label="Message" value={selected.message} />
                    <Detail icon={FileText} label="Came from" value={selected.source_page} />
                    <Detail icon={FileText} label="Level" value={(selected.level ?? 'ug').toUpperCase()} />
                  </div>
                  <p className="mt-2 text-[11px] text-gray-400">
                    These are exactly as submitted and cannot be edited.
                  </p>
                </div>

                {/* The team's own fields */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Team
                  </h3>

                  <div>
                    <label htmlFor="assigned" className="mb-1 block text-xs font-semibold text-gray-700">
                      Assigned to
                    </label>
                    <input
                      id="assigned"
                      defaultValue={selected.assigned_to ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (selected.assigned_to ?? '')) patch(selected, { assigned_to: v || null });
                      }}
                      placeholder="Counsellor name"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="followup" className="mb-1 block text-xs font-semibold text-gray-700">
                      Follow up on
                    </label>
                    <input
                      id="followup"
                      type="date"
                      defaultValue={selected.follow_up_on ? String(selected.follow_up_on).slice(0, 10) : ''}
                      onChange={(e) => patch(selected, { follow_up_on: e.target.value || null })}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="notes" className="mb-1 block text-xs font-semibold text-gray-700">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      rows={5}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="What was discussed, what was promised, what happens next."
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20"
                    />
                    <button
                      onClick={saveNotes}
                      disabled={savingNotes || notesDraft === (selected.admin_notes ?? '')}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-medical-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {savingNotes && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save notes
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Last contacted: {fmtDate(selected.last_contacted_at)}
                    {selected.follow_up_on && ` · Follow-up ${fmtDay(selected.follow_up_on)}`}
                  </div>
                </div>
              </div>

              <footer className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3.5">
                <a
                  href={`tel:${selected.phone}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-medical-500/20"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
                <a
                  href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700"
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </a>
                <button
                  onClick={() => remove(selected)}
                  aria-label="Delete this enquiry"
                  className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
