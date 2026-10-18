"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, LayoutList, Loader2, RefreshCw } from "lucide-react";
import { listRows, updateRow } from "@/lib/adminApi";
import { Badge, Button, Card, EmptyState, Notice, Toggle } from "@/components/admin/ui";

interface SectionRow {
  id: number;
  page: string;
  section_key: string;
  label: string;
  description: string | null;
  display_order: number;
  is_visible: boolean;
}

const PAGE_LABELS: Record<string, string> = {
  home: "Homepage",
};

const ORDER_BTN =
  "flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent";

export default function SectionsEditor() {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setSections(await listRows<SectionRow>("sections"));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load the sections";
      toast.error(message);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const byPage = useMemo(() => {
    const map = new Map<string, SectionRow[]>();
    for (const s of sections) {
      if (!map.has(s.page)) map.set(s.page, []);
      map.get(s.page)!.push(s);
    }
    for (const list of Array.from(map.values())) {
      list.sort((a, b) => a.display_order - b.display_order || a.id - b.id);
    }
    return Array.from(map.entries());
  }, [sections]);

  const toggle = async (row: SectionRow) => {
    setBusy(row.id);
    try {
      await updateRow("sections", row.id, { is_visible: !row.is_visible });
      toast.success(
        row.is_visible ? `"${row.label}" hidden from the page` : `"${row.label}" is back on the page`,
      );
      load();
    } catch {
      toast.error("Could not change that");
    } finally {
      setBusy(null);
    }
  };

  const move = async (list: SectionRow[], index: number, dir: -1 | 1) => {
    const a = list[index];
    const b = list[index + dir];
    if (!a || !b) return;
    setBusy(a.id);
    try {
      await Promise.all([
        updateRow("sections", a.id, { display_order: b.display_order }),
        updateRow("sections", b.id, { display_order: a.display_order }),
      ]);
      load();
    } finally {
      setBusy(null);
    }
  };

  if (loading && sections.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {loadError && (
        <Notice
          tone="danger"
          title="The page layout did not load"
          action={
            <Button size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          }
        >
          {loadError}
        </Notice>
      )}

      <Notice tone="neutral">
        Turn a block of a page on or off, or change the order it appears in. The words inside each
        block are edited in the other two tabs.
      </Notice>

      {byPage.length === 0
        ? !loadError && (
            <Card>
              <EmptyState
                icon={LayoutList}
                title="No page sections registered"
                hint="A section without a row here is always shown, in its built-in order."
              />
            </Card>
          )
        : byPage.map(([page, list]) => {
            const hidden = list.filter((s) => !s.is_visible).length;
            return (
              <Card
                key={page}
                flush
                title={PAGE_LABELS[page] ?? page}
                actions={
                  <>
                    {hidden > 0 && <Badge>{hidden} hidden</Badge>}
                    <span className="text-xs text-slate-400">
                      {list.length} {list.length === 1 ? "section" : "sections"}
                    </span>
                  </>
                }
              >
                <ol className="divide-y divide-slate-100">
                  {list.map((s, i) => (
                    <li
                      key={s.id}
                      className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${s.is_visible ? "" : "bg-slate-50"} ${
                        busy === s.id ? "opacity-50" : ""
                      }`}
                    >
                      <span className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-slate-400">
                        {i + 1}
                      </span>

                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => move(list, i, -1)}
                          disabled={i === 0 || busy !== null}
                          aria-label="Move up"
                          className={ORDER_BTN}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(list, i, 1)}
                          disabled={i === list.length - 1 || busy !== null}
                          aria-label="Move down"
                          className={ORDER_BTN}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-semibold ${s.is_visible ? "text-slate-900" : "text-slate-500"}`}>
                            {s.label}
                          </span>
                          {!s.is_visible && <Badge>Hidden</Badge>}
                        </div>
                        {s.description && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{s.description}</p>}
                      </div>

                      <div className="shrink-0" title={s.is_visible ? "Hide this block" : "Show this block"}>
                        <Toggle
                          checked={s.is_visible}
                          onChange={() => toggle(s)}
                          disabled={busy !== null}
                          label={
                            <>
                              <span className="sr-only">{s.label}: </span>
                              <span className="hidden sm:inline">{s.is_visible ? "Shown" : "Hidden"}</span>
                              <span className="sr-only sm:hidden">{s.is_visible ? "shown" : "hidden"}</span>
                            </>
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            );
          })}
    </div>
  );
}
