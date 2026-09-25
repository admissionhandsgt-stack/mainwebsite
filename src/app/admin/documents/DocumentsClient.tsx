"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { DOCUMENT_TYPES, REQUIRED_COUNT, documentType } from "@/lib/documentCatalogue";

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
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/documents");
      if (!res.ok) throw new Error("load");
      const { candidates } = await res.json();
      setCandidates(candidates ?? []);
    } catch {
      setCandidates([]);
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

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-10 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone"
          aria-label="Search candidates"
          className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-cyan-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-gray-300" />
          <h2 className="mt-3 text-base font-bold text-gray-900">
            {candidates.length === 0 ? "No documents yet" : "Nobody matches that"}
          </h2>
          <p className="mx-auto mt-1 max-w-[48ch] text-sm text-gray-500">
            {candidates.length === 0
              ? "Candidates upload from their account. Nothing has come in so far."
              : "Try a different name or number."}
          </p>
        </div>
      ) : (
        filtered.map((c) => {
          const have = new Map(c.documents.map((d) => [d.docType, d]));
          const requiredDone = DOCUMENT_TYPES.filter((t) => !t.optional && have.has(t.slug)).length;
          const pending = c.documents.filter((d) => d.status === "uploaded").length;
          const isOpen = open === c.userId;

          return (
            <div key={c.userId} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <button
                onClick={() => setOpen(isOpen ? null : c.userId)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-4 p-4 text-left hover:bg-gray-50"
              >
                <span className="min-w-0 flex-grow">
                  <span className="block truncate text-[15px] font-bold text-gray-900">
                    {c.name || "Name not given"}
                    <span className="ml-2 font-mono text-[13px] font-normal text-gray-500">
                      {c.phone}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[13px] text-gray-500">
                    {requiredDone} of {REQUIRED_COUNT} required
                    {c.rank ? ` · rank ${c.rank.toLocaleString("en-IN")}` : ""}
                    {c.level ? ` · ${c.level.toUpperCase()}` : ""}
                  </span>
                </span>

                {pending > 0 && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                    {pending} to check
                  </span>
                )}
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                    requiredDone === REQUIRED_COUNT
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {requiredDone === REQUIRED_COUNT ? "Complete" : "Incomplete"}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isOpen && (
                <ul className="divide-y divide-gray-100 border-t border-gray-100">
                  {DOCUMENT_TYPES.map((type) => {
                    const doc = have.get(type.slug);
                    return (
                      <li key={type.slug} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <span className="min-w-0 flex-grow">
                          <span className="block text-[14px] font-semibold text-gray-900">
                            {type.label}
                            {type.optional && (
                              <span className="ml-2 text-[11px] font-normal uppercase tracking-wide text-gray-400">
                                optional
                              </span>
                            )}
                          </span>
                          {doc ? (
                            <span className="mt-0.5 block truncate text-[12.5px] text-gray-500">
                              {doc.name} · {Math.max(1, Math.round(doc.size / 1024))} KB
                              {doc.note ? ` · “${doc.note}”` : ""}
                            </span>
                          ) : (
                            <span className="mt-0.5 block text-[12.5px] text-gray-400">
                              Not uploaded
                            </span>
                          )}
                        </span>

                        {doc ? (
                          <span className="flex shrink-0 items-center gap-1.5">
                            <a
                              href={`/api/documents/${doc.id}`}
                              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Open
                            </a>
                            <button
                              onClick={() => review(doc, "verified")}
                              disabled={saving === doc.id || doc.status === "verified"}
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
                                doc.status === "verified"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                  : "border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700"
                              }`}
                              aria-label={`Mark ${type.label} checked`}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                const note = window.prompt(
                                  `What is wrong with "${type.label}"? The candidate sees this.`,
                                  doc.note ?? "",
                                );
                                if (note && note.trim()) review(doc, "rejected", note.trim());
                              }}
                              disabled={saving === doc.id}
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
                                doc.status === "rejected"
                                  ? "border-rose-300 bg-rose-50 text-rose-700"
                                  : "border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-700"
                              }`}
                              aria-label={`Ask for ${type.label} again`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </span>
                        ) : (
                          <span className="shrink-0 text-[12.5px] text-gray-300">—</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
