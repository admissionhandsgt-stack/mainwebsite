"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X,
} from "lucide-react";

interface Collection {
  id: number;
  slug: string;
  label: string;
  description: string | null;
  /** jsonb — comes back parsed on some driver paths and as a string on others. */
  fields: string[] | string;
  display_order: number;
}

interface Block {
  id: number;
  collection: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  icon: string | null;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  /** jsonb — arrives parsed or as a string depending on the driver path. */
  data: Record<string, string> | string | null;
  display_order: number;
  is_active: boolean;
}

/** jsonb comes back as a string on some driver paths; normalise both. */
function asObject(v: unknown): Record<string, string> {
  if (!v) return {};
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof v === "object" ? (v as Record<string, string>) : {};
}

/** A collection can declare "data.outcome" to get an extra free-text field. */
const isExtra = (f: string) => f.startsWith("data.");
const extraKey = (f: string) => f.slice(5);
const humanise = (k: string) => k.replace(/[_-]/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Every field a block can carry, with how it should be edited. */
const FIELD_META: Record<string, { label: string; kind: "text" | "textarea"; help?: string }> = {
  title: { label: "Title", kind: "text" },
  subtitle: { label: "Subtitle", kind: "text" },
  body: { label: "Body", kind: "textarea" },
  icon: { label: "Icon", kind: "text", help: "A Lucide icon name, e.g. Target, BarChart3, ShieldCheck" },
  image_url: { label: "Image URL", kind: "text" },
  link_url: { label: "Link URL", kind: "text" },
  link_label: { label: "Link text", kind: "text" },
};

const EMPTY: Partial<Block> = {
  title: "", subtitle: "", body: "", icon: "", image_url: "", link_url: "", link_label: "",
};

export default function BlocksEditor() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Block> | null>(null);
  // Collection-specific fields live in the `data` jsonb, edited separately
  // from the named columns and merged back on save.
  const [draftExtras, setDraftExtras] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const openEditor = (block: Partial<Block> | null) => {
    setEditing(block);
    setDraftExtras(block ? asObject(block.data) : {});
  };

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.all([
        fetch("/api/admin/collections", { cache: "no-store" }),
        fetch("/api/admin/blocks", { cache: "no-store" }),
      ]);
      if (!cRes.ok || !bRes.ok) throw new Error("Could not load the content");
      const cols: Collection[] = (await cRes.json()).data;
      setCollections(cols);
      setBlocks((await bRes.json()).data);
      setActive((a) => a ?? cols[0]?.slug ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const collection = collections.find((c) => c.slug === active) ?? null;
  const fields = useMemo(() => {
    let f = collection?.fields;
    if (typeof f === "string") {
      try {
        f = JSON.parse(f);
      } catch {
        f = undefined;
      }
    }
    return Array.isArray(f) && f.length
      ? f.filter((k) => k in FIELD_META || isExtra(k))
      : ["title", "body"];
  }, [collection]);

  const items = useMemo(
    () =>
      blocks
        .filter((b) => b.collection === active)
        .sort((a, b) => a.display_order - b.display_order || a.id - b.id),
    [blocks, active],
  );

  const save = async () => {
    if (!editing || !active) return;
    const payload: Record<string, unknown> = { collection: active };
    const extras: Record<string, string> = {};
    for (const f of fields) {
      if (isExtra(f)) extras[extraKey(f)] = (draftExtras[extraKey(f)] ?? "").trim();
      else payload[f] = (editing as Record<string, unknown>)[f] ?? "";
    }
    if (fields.some(isExtra)) payload.data = extras;
    if (!payload.title && !payload.body) {
      toast.error("Give the item a title or some body text before saving");
      return;
    }

    setSaving(true);
    try {
      const isNew = !editing.id;
      if (isNew) {
        payload.display_order = items.length
          ? Math.max(...items.map((i) => i.display_order)) + 1
          : 1;
        payload.is_active = true;
      }
      const res = await fetch(
        isNew ? "/api/admin/blocks" : `/api/admin/blocks/${editing.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not save");
      toast.success(isNew ? "Added and live on the site" : "Saved and live on the site");
      openEditor(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const patch = async (b: Block, values: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/blocks/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      toast.error("Could not save that change");
      return;
    }
    load();
  };

  /** Swap display_order with the neighbour, so the site order matches this list. */
  const move = async (index: number, dir: -1 | 1) => {
    const a = items[index];
    const b = items[index + dir];
    if (!a || !b) return;
    await Promise.all([
      fetch(`/api/admin/blocks/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: b.display_order }),
      }),
      fetch(`/api/admin/blocks/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: a.display_order }),
      }),
    ]);
    load();
  };

  const remove = async (b: Block) => {
    if (!window.confirm(`Delete "${b.title || "this item"}"? It disappears from the site straight away.`)) {
      return;
    }
    const res = await fetch(`/api/admin/blocks/${b.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete");
      return;
    }
    toast.success("Deleted");
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
      {/* Which section of the site */}
      <aside className="space-y-1 rounded-2xl border border-gray-200 bg-white p-3">
        {collections.map((c) => {
          const count = blocks.filter((b) => b.collection === c.slug).length;
          return (
            <button
              key={c.slug}
              onClick={() => {
                setActive(c.slug);
                openEditor(null);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${
                active === c.slug
                  ? "bg-medical-50 font-semibold text-medical-900"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="truncate">{c.label}</span>
              <span className="ml-2 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                {count}
              </span>
            </button>
          );
        })}
      </aside>

      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{collection?.label ?? "Content"}</h2>
            {collection?.description && (
              <p className="mt-0.5 text-sm text-gray-500">{collection.description}</p>
            )}
          </div>
          <button
            onClick={() => openEditor({ ...EMPTY })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-medical-500/20"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>

        {editing && (
          <div className="rounded-2xl border border-medical-200 bg-medical-50/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                {editing.id ? "Edit item" : "New item"}
              </h3>
              <button onClick={() => openEditor(null)} aria-label="Close the editor">
                <X className="h-4 w-4 text-gray-400 hover:text-gray-700" />
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((f) => {
                const extra = isExtra(f);
                const meta = extra
                  ? { label: humanise(extraKey(f)), kind: "text" as const, help: undefined }
                  : FIELD_META[f];
                const value = extra
                  ? draftExtras[extraKey(f)] ?? ""
                  : ((editing as Record<string, unknown>)[f] as string) ?? "";
                const onChange = (v: string) =>
                  extra
                    ? setDraftExtras((d) => ({ ...d, [extraKey(f)]: v }))
                    : setEditing((e) => ({ ...e, [f]: v }));
                return (
                  <div key={f}>
                    <label htmlFor={`f-${f}`} className="mb-1 block text-xs font-semibold text-gray-700">
                      {meta.label}
                    </label>
                    {meta.kind === "textarea" ? (
                      <textarea
                        id={`f-${f}`}
                        rows={4}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20"
                      />
                    ) : (
                      <input
                        id={`f-${f}`}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20"
                      />
                    )}
                    {meta.help && <p className="mt-1 text-xs text-gray-500">{meta.help}</p>}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-medical-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing.id ? "Save changes" : "Add to the site"}
              </button>
              <button
                onClick={() => openEditor(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center text-sm text-gray-500">
            Nothing in this section yet. Anything you add here appears on the site immediately.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((b, i) => (
              <li
                key={b.id}
                className={`rounded-2xl border bg-white p-4 ${
                  b.is_active ? "border-gray-200" : "border-gray-200 bg-gray-50 opacity-70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1}
                      aria-label="Move down"
                      className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">{b.title || "Untitled"}</span>
                      {b.icon && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                          {b.icon}
                        </span>
                      )}
                      {!b.is_active && (
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                          Hidden
                        </span>
                      )}
                    </div>
                    {b.subtitle && <p className="mt-0.5 text-sm text-gray-600">{b.subtitle}</p>}
                    {b.body && (
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500">{b.body}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => patch(b, { is_active: !b.is_active })}
                      aria-label={b.is_active ? "Hide from the site" : "Show on the site"}
                      title={b.is_active ? "Hide from the site" : "Show on the site"}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      {b.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openEditor(b)}
                      aria-label="Edit"
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-medical-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(b)}
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
      </div>
    </div>
  );
}
