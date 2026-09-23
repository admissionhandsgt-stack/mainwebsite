"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Save, Search, Undo2 } from "lucide-react";
import { listRows, updateRow } from "@/lib/adminApi";

interface SeoRow {
  id: number;
  route: string;
  page_label: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_image_url: string | null;
  no_index: boolean;
}

type Draft = Partial<Omit<SeoRow, "id" | "route">>;

// Google truncates around these lengths. Shown as guidance, not enforced —
// a long title is a judgement call, not an error.
const TITLE_LIMIT = 60;
const DESC_LIMIT = 160;

function CountedField({
  id,
  label,
  value,
  limit,
  rows,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  limit?: number;
  rows?: number;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const over = limit != null && value.length > limit;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-gray-700">
          {label}
        </label>
        {limit != null && (
          <span className={`text-[11px] ${over ? "font-semibold text-amber-600" : "text-gray-400"}`}>
            {value.length}/{limit}
            {over && " — Google will trim this"}
          </span>
        )}
      </div>
      {rows ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20"
        />
      ) : (
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20"
        />
      )}
    </div>
  );
}

export default function SeoPage() {
  const [pages, setPages] = useState<SeoRow[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listRows<SeoRow>("seo");
      setPages(rows);
      setActiveId((id) => id ?? rows[0]?.id ?? null);
      setDraft({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the pages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const active = pages.find((p) => p.id === activeId) ?? null;
  const field = (k: keyof Draft) =>
    (draft[k] ?? (active ? active[k as keyof SeoRow] : "") ?? "") as string;

  const dirty = useMemo(() => {
    if (!active) return false;
    return Object.entries(draft).some(
      ([k, v]) => (v ?? "") !== ((active[k as keyof SeoRow] ?? "") as unknown),
    );
  }, [draft, active]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        p.page_label.toLowerCase().includes(q) || p.route.toLowerCase().includes(q),
    );
  }, [pages, query]);

  const save = async () => {
    if (!active || !dirty) return;
    setSaving(true);
    try {
      await updateRow("seo", active.id, {
        title: field("title"),
        description: field("description"),
        keywords: field("keywords"),
        og_image_url: field("og_image_url"),
        no_index: draft.no_index ?? active.no_index,
      });
      toast.success("Saved — the page serves this on its next load");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const noIndex = draft.no_index ?? active?.no_index ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Search & sharing</h1>
          <p className="mt-1 text-sm text-gray-500">
            The title and description each page shows in Google and when it is shared.
            Leave a field blank to keep what the page ships with.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[17rem_1fr]">
        <aside className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a page"
              aria-label="Find a page"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-medical-500"
            />
          </div>
          <div className="space-y-1 rounded-2xl border border-gray-200 bg-white p-2">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveId(p.id);
                  setDraft({});
                }}
                className={`w-full rounded-xl px-3.5 py-2.5 text-left transition-colors ${
                  activeId === p.id
                    ? "bg-medical-50 text-medical-900"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="truncate">{p.page_label}</span>
                  {p.no_index && (
                    <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                      Hidden
                    </span>
                  )}
                </div>
                <code className="text-[11px] text-gray-400">{p.route}</code>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-gray-500">No page matches that.</p>
            )}
          </div>
        </aside>

        {active && (
          <div className="space-y-5">
            {/* What the result actually looks like beats any field label. */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                Google preview
              </h2>
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs text-gray-600">
                  admissionhands.com{active.route === "/" ? "" : active.route}
                </div>
                <div className="mt-0.5 truncate text-lg text-[#1a0dab]">
                  {field("title") || "(the page's own title)"}
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">
                  {field("description") || "(the page's own description)"}
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
              <CountedField
                id="seo-title"
                label="Page title"
                value={field("title")}
                limit={TITLE_LIMIT}
                placeholder="Leave blank to keep the built-in title"
                onChange={(v) => setDraft({ ...draft, title: v })}
              />
              <CountedField
                id="seo-desc"
                label="Description"
                value={field("description")}
                limit={DESC_LIMIT}
                rows={3}
                placeholder="Leave blank to keep the built-in description"
                onChange={(v) => setDraft({ ...draft, description: v })}
              />
              <CountedField
                id="seo-keywords"
                label="Keywords"
                value={field("keywords")}
                placeholder="Comma-separated"
                onChange={(v) => setDraft({ ...draft, keywords: v })}
              />
              <CountedField
                id="seo-og"
                label="Share image URL"
                value={field("og_image_url")}
                placeholder="/assets/images/… — used when the page is shared"
                onChange={(v) => setDraft({ ...draft, og_image_url: v })}
              />

              <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5">
                <input
                  type="checkbox"
                  checked={noIndex}
                  onChange={(e) => setDraft({ ...draft, no_index: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-medical-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">
                    Keep this page out of Google
                  </span>
                  <span className="block text-xs text-gray-500">
                    The page stays reachable by link — search engines are asked not to list it.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-medical-500/20 disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
              <button
                onClick={() => setDraft({})}
                disabled={!dirty}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <Undo2 className="h-4 w-4" />
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
