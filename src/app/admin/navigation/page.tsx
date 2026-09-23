"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, CornerDownRight, ExternalLink, Eye, EyeOff,
  Loader2, Pencil, Plus, Trash2, X,
} from "lucide-react";
import { listRows, createRow, updateRow, deleteRow } from "@/lib/adminApi";

interface NavRow {
  id: number;
  menu: string;
  label: string;
  url: string;
  parent_id: number | null;
  display_order: number;
  is_active: boolean;
  opens_new_tab: boolean;
}

const MENUS = [
  {
    slug: "header",
    label: "Main menu",
    help: "The links across the top of every page. An item with children becomes a dropdown.",
    allowsChildren: true,
  },
  {
    slug: "footer_explore",
    label: "Footer — Explore",
    help: "The link column in the footer, and the same list in the mobile accordion.",
    allowsChildren: false,
  },
  {
    slug: "footer_quick",
    label: "Footer — Mobile pills",
    help: "The row of rounded link pills shown in the footer on phones.",
    allowsChildren: false,
  },
];

const BLANK = { label: "", url: "", opens_new_tab: false, parent_id: null as number | null };

export default function NavigationPage() {
  const [items, setItems] = useState<NavRow[]>([]);
  const [menu, setMenu] = useState(MENUS[0]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(typeof BLANK & { id?: number }) | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listRows<NavRow>("nav"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the menus");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const inMenu = useMemo(
    () => items.filter((i) => i.menu === menu.slug),
    [items, menu],
  );
  const parents = useMemo(
    () =>
      inMenu
        .filter((i) => i.parent_id == null)
        .sort((a, b) => a.display_order - b.display_order || a.id - b.id),
    [inMenu],
  );
  const childrenOf = (id: number) =>
    inMenu
      .filter((i) => i.parent_id === id)
      .sort((a, b) => a.display_order - b.display_order || a.id - b.id);

  const save = async () => {
    if (!editing) return;
    if (!editing.label.trim() || !editing.url.trim()) {
      toast.error("A link needs both a label and a URL");
      return;
    }

    setSaving(true);
    try {
      const siblings = editing.parent_id ? childrenOf(editing.parent_id) : parents;
      const payload = {
        menu: menu.slug,
        label: editing.label.trim(),
        url: editing.url.trim(),
        parent_id: editing.parent_id,
        opens_new_tab: editing.opens_new_tab,
      };

      if (editing.id) {
        await updateRow("nav", editing.id, payload);
      } else {
        await createRow("nav", {
          ...payload,
          display_order: siblings.length
            ? Math.max(...siblings.map((s) => s.display_order)) + 1
            : 1,
          is_active: true,
        });
      }
      toast.success(editing.id ? "Link updated" : "Link added");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  /** Swap order with the neighbour inside the same level. */
  const move = async (list: NavRow[], index: number, dir: -1 | 1) => {
    const a = list[index];
    const b = list[index + dir];
    if (!a || !b) return;
    await Promise.all([
      updateRow("nav", a.id, { display_order: b.display_order }),
      updateRow("nav", b.id, { display_order: a.display_order }),
    ]);
    load();
  };

  const toggle = async (row: NavRow) => {
    await updateRow("nav", row.id, { is_active: !row.is_active });
    load();
  };

  const remove = async (row: NavRow) => {
    const kids = childrenOf(row.id);
    const warning = kids.length
      ? `Delete "${row.label}" and its ${kids.length} sub-links?`
      : `Delete "${row.label}"?`;
    if (!window.confirm(`${warning} It disappears from the site straight away.`)) return;
    try {
      await deleteRow("nav", row.id);
      toast.success("Deleted");
      load();
    } catch {
      toast.error("Could not delete");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const renderRow = (row: NavRow, list: NavRow[], index: number, isChild: boolean) => (
    <div
      key={row.id}
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
        isChild ? "ml-8 border-gray-100 bg-gray-50/60" : "border-gray-200 bg-white"
      } ${row.is_active ? "" : "opacity-60"}`}
    >
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => move(list, index, -1)}
          disabled={index === 0}
          aria-label="Move up"
          className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => move(list, index, 1)}
          disabled={index === list.length - 1}
          aria-label="Move down"
          className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {isChild && <CornerDownRight className="h-4 w-4 shrink-0 text-gray-300" />}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-900">{row.label}</span>
          {row.opens_new_tab && <ExternalLink className="h-3 w-3 text-gray-400" />}
          {!row.is_active && (
            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
              Hidden
            </span>
          )}
        </div>
        <code className="text-xs text-gray-400">{row.url}</code>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {menu.allowsChildren && !isChild && (
          <button
            onClick={() => setEditing({ ...BLANK, parent_id: row.id })}
            title="Add a sub-link"
            className="rounded-lg px-2 py-2 text-xs font-semibold text-gray-400 hover:bg-gray-100 hover:text-medical-700"
          >
            + Sub-link
          </button>
        )}
        <button
          onClick={() => toggle(row)}
          aria-label={row.is_active ? "Hide from the site" : "Show on the site"}
          title={row.is_active ? "Hide from the site" : "Show on the site"}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          {row.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button
          onClick={() =>
            setEditing({
              id: row.id,
              label: row.label,
              url: row.url,
              opens_new_tab: row.opens_new_tab,
              parent_id: row.parent_id,
            })
          }
          aria-label="Edit"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-medical-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => remove(row)}
          aria-label="Delete"
          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Navigation</h1>
        <p className="mt-1 text-sm text-gray-500">
          The menus on every page. Changes go live without a deploy.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {MENUS.map((m) => (
          <button
            key={m.slug}
            onClick={() => {
              setMenu(m);
              setEditing(null);
            }}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              menu.slug === m.slug
                ? "bg-medical-50 text-medical-900"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-gray-500">{menu.help}</p>
        <button
          onClick={() => setEditing({ ...BLANK })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-medical-500/20"
        >
          <Plus className="h-4 w-4" />
          Add link
        </button>
      </div>

      {editing && (
        <div className="rounded-2xl border border-medical-200 bg-medical-50/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">
              {editing.id
                ? "Edit link"
                : editing.parent_id
                  ? `New sub-link under "${items.find((i) => i.id === editing.parent_id)?.label ?? ""}"`
                  : "New link"}
            </h2>
            <button onClick={() => setEditing(null)} aria-label="Close the editor">
              <X className="h-4 w-4 text-gray-400 hover:text-gray-700" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nav-label" className="mb-1 block text-xs font-semibold text-gray-700">
                Label
              </label>
              <input
                id="nav-label"
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20"
              />
            </div>
            <div>
              <label htmlFor="nav-url" className="mb-1 block text-xs font-semibold text-gray-700">
                URL
              </label>
              <input
                id="nav-url"
                value={editing.url}
                onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                placeholder="/mbbs-india"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20"
              />
              <p className="mt-1 text-xs text-gray-500">
                A path on this site, or a full https:// address.
              </p>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={editing.opens_new_tab}
              onChange={(e) => setEditing({ ...editing, opens_new_tab: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-medical-600"
            />
            Open in a new tab
          </label>

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-medical-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing.id ? "Save changes" : "Add to the menu"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {parents.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center text-sm text-gray-500">
          This menu is empty, so the site falls back to the links built into the code.
          Add one here to take over.
        </p>
      ) : (
        <div className="space-y-2">
          {parents.map((row, i) => (
            <div key={row.id} className="space-y-2">
              {renderRow(row, parents, i, false)}
              {childrenOf(row.id).map((child, ci, kids) =>
                renderRow(child, kids, ci, true),
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
