"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Globe, Loader2, RefreshCw, Save, Search, Undo2 } from "lucide-react";
import { listRows, updateRow } from "@/lib/adminApi";
import {
  Badge, Button, Card, EmptyState, INPUT, INPUT_H, Notice, PageHeader, TEXTAREA, Toggle,
} from "@/components/admin/ui";

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

// The search box needs room on the left for its icon. Swapped into the kit's
// class rather than appended, so the two left paddings cannot fight.
const SEARCH_INPUT = `${INPUT.replace("px-3", "pl-9 pr-3")} ${INPUT_H}`;

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
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-slate-700">
          {label}
        </label>
        {limit != null && (
          <span className={`text-[11px] tabular-nums ${over ? "font-semibold text-amber-700" : "text-slate-400"}`}>
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
          className={TEXTAREA}
        />
      ) : (
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} ${INPUT_H}`}
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listRows<SeoRow>("seo");
      setPages(rows);
      setActiveId((id) => id ?? rows[0]?.id ?? null);
      setDraft({});
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load the pages";
      toast.error(message);
      setLoadError(message);
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

  const header = (
    <PageHeader
      title="Search & sharing"
      description="The title and description each page shows in Google and when it is shared. Leave a field blank to keep what the page ships with."
      actions={
        <Button onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    />
  );

  if (loading && pages.length === 0) {
    return (
      <div>
        {header}
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  const noIndex = draft.no_index ?? active?.no_index ?? false;

  return (
    <div>
      {header}

      <div className="space-y-5">
        {loadError && (
          <Notice
            tone="danger"
            title="The pages did not load"
            action={
              <Button size="sm" onClick={load}>
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            }
          >
            {loadError}
          </Notice>
        )}

        {pages.length === 0 ? (
          !loadError && (
            <Card>
              <EmptyState
                icon={Globe}
                title="No pages registered"
                hint="Pages are added by the seed script. Until then each page uses its built-in title and description."
              />
            </Card>
          )
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <Card flush>
                <div className="border-b border-slate-100 p-2.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Find a page"
                      aria-label="Find a page"
                      className={SEARCH_INPUT}
                    />
                  </div>
                  <p className="mt-2 px-1 text-[11px] text-slate-400">
                    {filtered.length === pages.length
                      ? `${pages.length} pages`
                      : `${filtered.length} of ${pages.length} pages`}
                  </p>
                </div>
                {/* Scrolls inside itself, so on a phone the editor is not pushed below every page. */}
                <nav className="max-h-72 space-y-0.5 overflow-y-auto p-2 lg:max-h-[calc(100vh-14rem)]" aria-label="Pages">
                  {filtered.map((p) => {
                    const on = activeId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setActiveId(p.id);
                          setDraft({});
                        }}
                        aria-current={on ? "true" : undefined}
                        className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                          on ? "bg-cyan-50 text-cyan-900" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="truncate">{p.page_label}</span>
                          {p.no_index && (
                            <span className="shrink-0">
                              <Badge tone="warning">Hidden</Badge>
                            </span>
                          )}
                        </div>
                        <code className="block truncate text-[11px] text-slate-400">{p.route}</code>
                      </button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-slate-500">No page matches that.</p>
                  )}
                </nav>
              </Card>
            </aside>

            {active && (
              <Card
                title={active.page_label}
                description={<code className="text-xs text-slate-500">{active.route}</code>}
                actions={
                  <>
                    {noIndex && <Badge tone="warning">Hidden from Google</Badge>}
                    {dirty && <Badge tone="warning">Unsaved</Badge>}
                  </>
                }
              >
                {/* Locked while a reload is in flight: the reload clears the draft, so
                    anything typed during it would be thrown away. */}
                <fieldset disabled={loading} className="min-w-0 space-y-5">
                  {/* What the result actually looks like beats any field label. */}
                  <div>
                    <p className="mb-1.5 text-[13px] font-medium text-slate-700">Google preview</p>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="truncate text-xs text-slate-600">
                        admissionhands.com{active.route === "/" ? "" : active.route}
                      </div>
                      {/* Google's own link colour, so the preview reads like a real result. */}
                      <div className="mt-0.5 truncate text-lg text-[#1a0dab]">
                        {field("title") || "(the page's own title)"}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">
                        {field("description") || "(the page's own description)"}
                      </p>
                    </div>
                  </div>

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
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                  </div>

                  <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">Keep this page out of Google</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                        The page stays reachable by link — search engines are asked not to list it.
                      </p>
                    </div>
                    <Toggle
                      checked={noIndex}
                      onChange={(v) => setDraft({ ...draft, no_index: v })}
                      label={<span className="sr-only">Keep this page out of Google</span>}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <Button variant="primary" onClick={save} disabled={!dirty || saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                    <Button variant="ghost" onClick={() => setDraft({})} disabled={!dirty}>
                      <Undo2 className="h-4 w-4" />
                      Discard
                    </Button>
                  </div>
                </fieldset>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
