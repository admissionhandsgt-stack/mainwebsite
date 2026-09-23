"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2 } from "lucide-react";
import { listRows, updateRow } from "@/lib/adminApi";

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

export default function SectionsEditor() {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setSections(await listRows<SectionRow>("sections"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the sections");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="rounded-2xl border border-gray-200 bg-white/70 px-5 py-3.5 text-sm text-gray-600 backdrop-blur">
        Turn a block of the page on or off, or change the order it appears in. The content
        of each block is edited in the other two tabs.
      </p>

      {byPage.map(([page, list]) => (
        <section key={page} className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
            {PAGE_LABELS[page] ?? page}
          </h2>
          <ul className="space-y-2">
            {list.map((s, i) => (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                  s.is_visible ? "border-gray-200" : "border-gray-200 bg-gray-50 opacity-70"
                } ${busy === s.id ? "opacity-50" : ""}`}
              >
                <span className="w-6 shrink-0 text-center text-xs font-bold text-gray-300">
                  {i + 1}
                </span>

                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => move(list, i, -1)}
                    disabled={i === 0 || busy !== null}
                    aria-label="Move up"
                    className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(list, i, 1)}
                    disabled={i === list.length - 1 || busy !== null}
                    aria-label="Move down"
                    className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">{s.label}</span>
                    {!s.is_visible && (
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                        Hidden
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <p className="mt-0.5 text-xs text-gray-500">{s.description}</p>
                  )}
                </div>

                <button
                  onClick={() => toggle(s)}
                  disabled={busy !== null}
                  title={s.is_visible ? "Hide this block" : "Show this block"}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    s.is_visible
                      ? "text-gray-500 hover:bg-gray-100"
                      : "bg-medical-50 text-medical-700 hover:bg-medical-100"
                  }`}
                >
                  {s.is_visible ? (
                    <>
                      <Eye className="h-3.5 w-3.5" /> Visible
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> Hidden
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
