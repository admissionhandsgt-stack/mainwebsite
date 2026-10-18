"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { DOCUMENT_TYPES, REQUIRED_COUNT, documentType } from "@/lib/documentCatalogue";
import { Badge, BUTTON, Button, Card, EmptyState, INPUT, INPUT_H, Notice, Toolbar } from "@/components/admin/ui";

interface Doc {
  id: number;
  docType: string;
  name: string;
  mime: string;
  size: number;
  status: "uploaded" | "verified" | "rejected";
  note: string | null;
  uploadedAt: string;
}

interface Candidate {
  userId: number;
  name: string | null;
  phone: string;
  level: string | null;
  rank: number | null;
  lastUpload: string;
  documents: Doc[];
}

/** The per-file buttons: one height, one shape; the colour says what state the file is in. */
const ACT =
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
};

/**
 * The team's review screen.
 *
 * One row per candidate, not per file. Staff are answering "can this person
 * report?", and that question is about a set being complete — a flat list of
 * every file uploaded by everybody cannot be read that way.
 *
 * Opening a candidate shows the full fourteen, including the ones still
 * missing, because the missing ones are the reason to open it.
 */
export default function DocumentsClient() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/admin/documents");
      if (!res.ok) throw new Error("load");
      const { candidates } = await res.json();
      setCandidates(candidates ?? []);
    } catch {
      setCandidates([]);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (doc: Doc, status: Doc["status"], note?: string) => {
    setSaving(doc.id);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id, status, note: note ?? null }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "Could not save that.");
        return;
      }
      setCandidates((list) =>
        list.map((c) => ({
          ...c,
          documents: c.documents.map((d) =>
            d.id === doc.id ? { ...d, status, note: note ?? null } : d,
          ),
        })),
      );
    } finally {
      setSaving(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) => (c.name ?? "").toLowerCase().includes(q) || c.phone.includes(q),
    );
  }, [candidates, query]);

  const toCheck = useMemo(
    () => candidates.reduce((n, c) => n + c.documents.filter((d) => d.status === "uploaded").length, 0),
    [candidates],
  );

  if (loading) {
    return (
      <Card flush>
        <div aria-busy="true" aria-label="Loading documents" className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-48 max-w-full animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Toolbar>
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or phone"
            aria-label="Search candidates"
            className={`${INPUT} ${INPUT_H} pl-9`}
          />
        </div>
        <Button size="md" onClick={() => load()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
        {candidates.length > 0 && (
          <span className="flex w-full flex-wrap items-center gap-2 text-xs tabular-nums text-slate-500 sm:w-auto">
            {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"}
            {toCheck > 0 && <Badge tone="warning">{toCheck} to check</Badge>}
          </span>
        )}
      </Toolbar>

      {failed && (
        <Notice
          tone="danger"
          title="Could not load the documents"
          action={<Button size="sm" onClick={() => load()}>Retry</Button>}
        >
          The list below may be empty because it did not load, not because nothing was uploaded.
        </Notice>
      )}

      {filtered.length === 0 ? (
        failed ? null : (
          <Card flush>
            <EmptyState
              icon={FileText}
              title={candidates.length === 0 ? "No documents yet" : "Nobody matches that"}
              hint={
                candidates.length === 0
                  ? "Candidates upload from their account. Nothing has come in so far."
                  : "Try a different name or number."
              }
            />
          </Card>
        )
      ) : (
        <Card flush>
          <ul className="divide-y divide-slate-100">
            {filtered.map((c) => {
              const have = new Map(c.documents.map((d) => [d.docType, d]));
              const requiredDone = DOCUMENT_TYPES.filter((t) => !t.optional && have.has(t.slug)).length;
              const pending = c.documents.filter((d) => d.status === "uploaded").length;
              const isOpen = open === c.userId;
              const complete = requiredDone === REQUIRED_COUNT;
              const pct = REQUIRED_COUNT ? Math.round((requiredDone / REQUIRED_COUNT) * 100) : 0;
              const last = fmtDate(c.lastUpload);

              return (
                <li key={c.userId}>
                  <button
                    onClick={() => setOpen(isOpen ? null : c.userId)}
                    aria-expanded={isOpen}
                    className={`flex w-full flex-col gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${
                      isOpen ? "bg-slate-50" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="min-w-0 max-w-full truncate text-[15px] font-semibold text-slate-900">
                          {c.name || "Name not given"}
                        </span>
                        <span className="font-mono text-[13px] text-slate-500">{c.phone}</span>
                      </span>
                      <span className="mt-0.5 block text-[13px] text-slate-500">
                        {c.level ? c.level.toUpperCase() : "Level not given"}
                        {c.rank ? ` · rank ${c.rank.toLocaleString("en-IN")}` : ""}
                        {last ? ` · last upload ${last}` : ""}
                      </span>
                    </span>

                    <span className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                      <span className="flex items-center gap-2" title={`${requiredDone} of ${REQUIRED_COUNT} required documents`}>
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                          <span
                            className={`block h-full rounded-full ${complete ? "bg-emerald-500" : "bg-cyan-600"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="text-xs tabular-nums text-slate-500">
                          {requiredDone} of {REQUIRED_COUNT} required
                        </span>
                      </span>
                      {pending > 0 && <Badge tone="warning">{pending} to check</Badge>}
                      <Badge tone={complete ? "success" : "neutral"}>{complete ? "Complete" : "Incomplete"}</Badge>
                      <ChevronDown
                        className={`ml-auto h-5 w-5 shrink-0 text-slate-400 transition-transform sm:ml-0 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>

                  {isOpen && (
                    <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/60">
                      {DOCUMENT_TYPES.map((type) => {
                        const doc = have.get(type.slug);
                        const busy = doc ? saving === doc.id : false;
                        return (
                          <li key={type.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                            <span className="min-w-0 flex-1 basis-60">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900">{type.label}</span>
                                {type.optional && (
                                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                    optional
                                  </span>
                                )}
                                {doc?.status === "verified" && <Badge tone="success">Checked</Badge>}
                                {doc?.status === "rejected" && <Badge tone="danger">Asked again</Badge>}
                                {doc?.status === "uploaded" && <Badge tone="warning">To check</Badge>}
                                {!doc && !type.optional && <Badge tone="neutral">Missing</Badge>}
                              </span>
                              {doc ? (
                                <span className="mt-0.5 block truncate text-[12.5px] text-slate-500">
                                  {doc.name} · {Math.max(1, Math.round(doc.size / 1024))} KB
                                  {doc.note ? ` · “${doc.note}”` : ""}
                                </span>
                              ) : (
                                <span className="mt-0.5 block text-[12.5px] text-slate-400">
                                  Not uploaded
                                </span>
                              )}
                            </span>

                            {doc && (
                              <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                                <a
                                  href={`/api/documents/${doc.id}`}
                                  className={`${BUTTON.secondary} h-9 px-3 text-[13px]`}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Open
                                </a>
                                <button
                                  onClick={() => review(doc, "verified")}
                                  disabled={busy || doc.status === "verified"}
                                  className={`${ACT} ${
                                    doc.status === "verified"
                                      ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  }`}
                                  aria-label={`Mark ${type.label} checked`}
                                >
                                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                  {doc.status === "verified" ? "Checked" : "Mark checked"}
                                </button>
                                <button
                                  onClick={() => {
                                    const note = window.prompt(
                                      `What is wrong with "${type.label}"? The candidate sees this.`,
                                      doc.note ?? "",
                                    );
                                    if (note && note.trim()) review(doc, "rejected", note.trim());
                                  }}
                                  disabled={busy}
                                  className={`${ACT} disabled:cursor-not-allowed disabled:opacity-50 ${
                                    doc.status === "rejected"
                                      ? "border-red-200 bg-red-50 text-red-700"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:text-red-700"
                                  }`}
                                  aria-label={`Ask for ${type.label} again`}
                                >
                                  <X className="h-4 w-4" />
                                  Ask again
                                </button>
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
