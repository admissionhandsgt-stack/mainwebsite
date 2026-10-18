"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, Eye, EyeOff, Layers, Loader2, Pencil, Plus, RefreshCw, Trash2,
} from "lucide-react";
import {
  Badge, BUTTON, Button, Card, Drawer, EmptyState, Field, INPUT, INPUT_H, Notice, SIZE, TEXTAREA,
} from "@/components/admin/ui";

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

// Nested lists (a step's bullets, a quota's facts) are stored one item per line
// and parsed by lines()/pairs() in pgContent.ts. A single-line <input> strips
// line breaks from whatever is typed into it, so those keys — and any extra
// whose value already holds a line break — are edited in a textarea.
const LIST_KEYS = new Set(["bullets", "facts"]);

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

// Small square controls in a row. The delete one turns red on hover; swapped into
// the kit's ghost class rather than appended, so the two hovers cannot fight.
const ICON_BTN = `${BUTTON.ghost} ${SIZE.icon}`;
const ICON_BTN_DANGER = `${BUTTON.ghost.replace("text-slate-600 hover:bg-slate-100", "text-slate-500 hover:bg-red-50 hover:text-red-600")} ${SIZE.icon}`;
const ORDER_BTN =
  "flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent";

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
  const [loadError, setLoadError] = useState<string | null>(null);

  const openEditor = (block: Partial<Block> | null) => {
    setEditing(block);
    setDraftExtras(block ? asObject(block.data) : {});
  };

  const load = async () => {
    setLoading(true);
    setLoadError(null);
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
      const message = e instanceof Error ? e.message : "Could not load the content";
      toast.error(message);
      setLoadError(message);
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

  const pickCollection = (slug: string) => {
    setActive(slug);
    openEditor(null);
  };

  if (loading && collections.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const countFor = (slug: string) => blocks.filter((b) => b.collection === slug).length;

  return (
    <div className="space-y-5">
      {loadError && (
        <Notice
          tone="danger"
          title="The content did not load"
          action={
            <Button size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          }
        >
          {loadError}
        </Notice>
      )}

      {collections.length === 0 ? (
        !loadError && (
          <Card>
            <EmptyState
              icon={Layers}
              title="No sections to edit yet"
              hint="Collections are registered by the seed script. Until then every section shows its built-in copy."
            />
          </Card>
        )
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
          {/* Which section of the site — a dropdown on phones, a list beside the items on wide screens. */}
          <div className="lg:hidden">
            <Field label="Section of the site" htmlFor="blocks-collection">
              <select
                id="blocks-collection"
                value={active ?? ""}
                onChange={(e) => pickCollection(e.target.value)}
                className={`${INPUT} ${INPUT_H}`}
              >
                {collections.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label} ({countFor(c.slug)})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
            <Card flush>
              <nav className="space-y-0.5 p-2" aria-label="Sections of the site">
                {collections.map((c) => {
                  const on = active === c.slug;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => pickCollection(c.slug)}
                      aria-current={on ? "true" : undefined}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        on ? "bg-cyan-50 font-semibold text-cyan-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate">{c.label}</span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                          on ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {countFor(c.slug)}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </aside>

          <Card
            flush
            title={collection?.label ?? "Content"}
            description={collection?.description ?? undefined}
            actions={
              <Button variant="primary" size="sm" onClick={() => openEditor({ ...EMPTY })}>
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            }
          >
            {items.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="Nothing in this section yet"
                hint="Until you add an item, the site shows the copy it shipped with. Anything you add here appears straight away."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((b, i) => (
                  <li
                    key={b.id}
                    className={`flex items-start gap-3 px-4 py-3.5 sm:px-5 ${b.is_active ? "" : "bg-slate-50"}`}
                  >
                    <div className="flex flex-col pt-0.5">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        aria-label="Move up"
                        className={ORDER_BTN}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === items.length - 1}
                        aria-label="Move down"
                        className={ORDER_BTN}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-semibold ${b.is_active ? "text-slate-900" : "text-slate-500"}`}>
                          {b.title || "Untitled"}
                        </span>
                        {b.icon && (
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{b.icon}</code>
                        )}
                        {!b.is_active && <Badge>Hidden</Badge>}
                      </div>
                      {b.subtitle && <p className="mt-0.5 text-sm text-slate-600">{b.subtitle}</p>}
                      {b.body && (
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">{b.body}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => patch(b, { is_active: !b.is_active })}
                        aria-label={b.is_active ? "Hide from the site" : "Show on the site"}
                        title={b.is_active ? "Hide from the site" : "Show on the site"}
                        className={ICON_BTN}
                      >
                        {b.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditor(b)}
                        aria-label="Edit"
                        title="Edit"
                        className={ICON_BTN}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(b)}
                        aria-label="Delete"
                        title="Delete"
                        className={ICON_BTN_DANGER}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <Drawer
        open={!!editing}
        title={
          editing?.id
            ? `Edit item${collection ? ` · ${collection.label}` : ""}`
            : `New item${collection ? ` · ${collection.label}` : ""}`
        }
        onClose={() => openEditor(null)}
        footer={
          <>
            <Button onClick={() => openEditor(null)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing?.id ? "Save changes" : "Add to the site"}
            </Button>
          </>
        }
      >
        {editing && (
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
              const list = extra && (LIST_KEYS.has(extraKey(f)) || value.includes("\n"));
              return (
                <Field
                  key={f}
                  label={meta.label}
                  htmlFor={`f-${f}`}
                  hint={meta.help ?? (list ? "One item per line." : undefined)}
                >
                  {meta.kind === "textarea" || list ? (
                    <textarea
                      id={`f-${f}`}
                      rows={4}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className={TEXTAREA}
                    />
                  ) : (
                    <input
                      id={`f-${f}`}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className={`${INPUT} ${INPUT_H}`}
                    />
                  )}
                </Field>
              );
            })}
          </div>
        )}
      </Drawer>
    </div>
  );
}
