"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, CornerDownRight, ExternalLink, Eye, EyeOff,
  Loader2, Menu as MenuIcon, Pencil, Plus, RefreshCw, Trash2,
} from "lucide-react";
import { listRows, createRow, updateRow, deleteRow } from "@/lib/adminApi";
import {
  Badge, BUTTON, Button, Card, Drawer, EmptyState, Field, INPUT, INPUT_H, Notice, PageHeader, SIZE, Tabs, Toggle,
} from "@/components/admin/ui";

interface NavRow {
  id: number;
  menu: string;
  label: string;
  url: string;
  parent_id: number | null;
  display_order: number;
  is_active: boolean;
  opens_new_tab: boolean;
  description: string | null;
}

/**
 * `depth` is how many levels a menu can hold (2026-10-21). The main menu has three: an item, its
 * groups (the titled columns of a mega menu, url "#"), and the links in each group — an item whose
 * children are plain links stays a simple dropdown. The footer's Explore menu has two: column headings
 * and their links.
 */
const MENUS = [
  {
    slug: "header",
    label: "Main menu",
    help: "The links across the top of every page. An item with sub-links becomes a dropdown; give those sub-links links of their own and they become the titled columns of a larger menu.",
    depth: 3,
  },
  {
    slug: "footer_explore",
    label: "Footer — Explore",
    help: "The footer's link columns: each top-level row with the address # is a column heading, and its sub-links are the column. A top-level row with an address of its own lands in a column called More.",
    depth: 2,
  },
  {
    slug: "footer_quick",
    label: "Footer — Bottom line",
    help: "The small links beside the copyright line at the very bottom: privacy, terms and the like.",
    depth: 1,
  },
];

const BLANK = { label: "", url: "", opens_new_tab: false, description: "", parent_id: null as number | null };

// Square row controls. The delete one turns red on hover; swapped into the kit's
// ghost class rather than appended, so the two hovers cannot fight.
const ICON_BTN = `${BUTTON.ghost} ${SIZE.icon}`;
const ICON_BTN_DANGER = `${BUTTON.ghost.replace("text-slate-600 hover:bg-slate-100", "text-slate-500 hover:bg-red-50 hover:text-red-600")} ${SIZE.icon}`;
const ORDER_BTN =
  "flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent";

export default function NavigationPage() {
  const [items, setItems] = useState<NavRow[]>([]);
  const [menu, setMenu] = useState(MENUS[0]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(typeof BLANK & { id?: number }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(await listRows<NavRow>("nav"));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load the menus";
      toast.error(message);
      setLoadError(message);
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
        description: editing.description.trim() || null,
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
    const below = (id: number): number => childrenOf(id).reduce((n, c) => n + 1 + below(c.id), 0);
    const kids = below(row.id);
    const warning = kids
      ? `Delete "${row.label}" and the ${kids} links under it?`
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

  const addLink = (
    <Button variant="primary" onClick={() => setEditing({ ...BLANK })}>
      <Plus className="h-4 w-4" />
      Add link
    </Button>
  );

  const header = (
    <PageHeader
      title="Navigation"
      description="The menus on every page. Changes go live without a deploy."
      // Hidden only during the first load, when the menu's existing links (and so
      // the new link's position) are not known yet.
      actions={loading && items.length === 0 ? undefined : addLink}
    >
      <Tabs
        items={MENUS.map((m) => ({
          id: m.slug,
          label: m.label,
          count: items.filter((i) => i.menu === m.slug).length,
        }))}
        value={menu.slug}
        onChange={(slug) => {
          setMenu(MENUS.find((m) => m.slug === slug) ?? MENUS[0]);
          setEditing(null);
        }}
      />
    </PageHeader>
  );

  if (loading && items.length === 0) {
    return (
      <div>
        {header}
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  const INDENT = ["pl-3 sm:pl-4", "bg-slate-50/70 pl-8 sm:pl-12", "bg-slate-50 pl-14 sm:pl-20"];
  const renderRow = (row: NavRow, list: NavRow[], index: number, depth: number) => (
    <li
      key={row.id}
      className={`flex items-center gap-3 py-2.5 pr-3 sm:pr-4 ${INDENT[depth] ?? INDENT[2]}`}
    >
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => move(list, index, -1)}
          disabled={index === 0}
          aria-label="Move up"
          className={ORDER_BTN}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => move(list, index, 1)}
          disabled={index === list.length - 1}
          aria-label="Move down"
          className={ORDER_BTN}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {depth > 0 && <CornerDownRight className="h-4 w-4 shrink-0 text-slate-300" />}

      <div className={`min-w-0 flex-1 ${row.is_active ? "" : "opacity-60"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-semibold ${depth ? "text-sm text-slate-800" : "text-slate-900"}`}>{row.label}</span>
          {childrenOf(row.id).length > 0 && depth < menu.depth - 1 && depth > 0 && <Badge>Group</Badge>}
          {row.opens_new_tab && (
            <ExternalLink className="h-3 w-3 text-slate-400" role="img" aria-label="Opens in a new tab" />
          )}
          {!row.is_active && <Badge>Hidden</Badge>}
        </div>
        <code className="block truncate text-xs text-slate-400">{row.url}</code>
        {row.description && <span className="block truncate text-xs text-slate-500">{row.description}</span>}
      </div>

      <div className="flex shrink-0 items-center">
        {depth < menu.depth - 1 && (
          <button
            type="button"
            onClick={() => setEditing({ ...BLANK, parent_id: row.id })}
            title="Add a sub-link"
            aria-label={`Add a sub-link under ${row.label}`}
            className={`${BUTTON.ghost} h-9 px-2 text-[13px]`}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Sub-link</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => toggle(row)}
          aria-label={row.is_active ? "Hide from the site" : "Show on the site"}
          title={row.is_active ? "Hide from the site" : "Show on the site"}
          className={ICON_BTN}
        >
          {row.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() =>
            setEditing({
              id: row.id,
              label: row.label,
              url: row.url,
              opens_new_tab: row.opens_new_tab,
              description: row.description ?? "",
              parent_id: row.parent_id,
            })
          }
          aria-label="Edit"
          title="Edit"
          className={ICON_BTN}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => remove(row)}
          aria-label="Delete"
          title="Delete"
          className={ICON_BTN_DANGER}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );

  return (
    <div>
      {header}

      <div className="space-y-5">
        {loadError && (
          <Notice
            tone="danger"
            title="The menus did not load"
            action={
              <Button size="sm" onClick={load}>
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            }
          >
            {loadError}
          </Notice>
        )}

        <Card flush title={menu.label} description={menu.help}>
          {parents.length === 0 ? (
            <EmptyState
              icon={MenuIcon}
              title="This menu is empty"
              hint="The site falls back to the links built into the code. Add one here to take over."
              action={addLink}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {parents.map((row, i) => (
                <li key={row.id}>
                  <ul className="divide-y divide-slate-100">
                    {renderRow(row, parents, i, 0)}
                    {childrenOf(row.id).map((child, ci, kids) => (
                      <li key={child.id}>
                        <ul className="divide-y divide-slate-100">
                          {renderRow(child, kids, ci, 1)}
                          {childrenOf(child.id).map((leaf, li, leaves) => renderRow(leaf, leaves, li, 2))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Drawer
        open={!!editing}
        title={
          editing?.id
            ? "Edit link"
            : editing?.parent_id
              ? `New sub-link under "${items.find((i) => i.id === editing.parent_id)?.label ?? ""}"`
              : "New link"
        }
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing?.id ? "Save changes" : "Add to the menu"}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              In <span className="font-medium text-slate-700">{menu.label}</span>
            </p>
            <Field label="Label" htmlFor="nav-label">
              <input
                id="nav-label"
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                className={`${INPUT} ${INPUT_H}`}
              />
            </Field>
            <Field label="URL" htmlFor="nav-url" hint="A path on this site, a full https:// address, or # for a header menu that only opens its list (like Other Courses).">
              <input
                id="nav-url"
                value={editing.url}
                onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                placeholder="/mbbs-india"
                className={`${INPUT} ${INPUT_H}`}
              />
            </Field>
            <Field
              label="Description (optional)"
              htmlFor="nav-description"
              hint="One short line under the link in the larger menus, e.g. “Every branch: seats, colleges and cutoff”."
            >
              <input
                id="nav-description"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                maxLength={90}
                className={`${INPUT} ${INPUT_H}`}
              />
            </Field>
            <Toggle
              checked={editing.opens_new_tab}
              onChange={(v) => setEditing({ ...editing, opens_new_tab: v })}
              label="Open in a new tab"
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}
