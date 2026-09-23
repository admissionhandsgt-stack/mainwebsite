"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Save, Undo2 } from "lucide-react";

interface Setting {
  id: number;
  key: string;
  value: string | null;
  value_type: "text" | "longtext" | "number" | "boolean" | "image" | "url";
  group_name: string;
  label: string;
  help: string | null;
  display_order: number;
}

// group_name is already written as a readable heading by the seed
// ("Home · Conversion band"), so only slug-style values need tidying up.
const groupTitle = (g: string) =>
  /^[a-z0-9_-]+$/.test(g)
    ? g.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : g;

export default function SettingsEditor() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load the settings");
      const { data } = await res.json();
      setSettings(data);
      setDraft({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const current = (s: Setting) => draft[s.id] ?? s.value ?? "";
  const changed = useMemo(
    () => settings.filter((s) => s.id in draft && draft[s.id] !== (s.value ?? "")),
    [settings, draft],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Setting[]>();
    for (const s of settings) {
      if (!map.has(s.group_name)) map.set(s.group_name, []);
      map.get(s.group_name)!.push(s);
    }
    return Array.from(map.entries());
  }, [settings]);

  const saveAll = async () => {
    if (changed.length === 0) return;
    setSaving(true);
    // Each setting is its own row, so a failure part-way leaves the rest saved.
    // Reporting the exact count avoids implying an all-or-nothing write.
    let saved = 0;
    for (const s of changed) {
      try {
        const res = await fetch(`/api/admin/settings/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: draft[s.id] }),
        });
        if (res.ok) saved += 1;
      } catch {
        /* counted as unsaved below */
      }
    }
    setSaving(false);
    if (saved === changed.length) {
      toast.success(`${saved} ${saved === 1 ? "change" : "changes"} published to the site`);
    } else {
      toast.error(`Saved ${saved} of ${changed.length}. Please retry the rest.`);
    }
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/70 px-5 py-3.5 backdrop-blur">
        <p className="text-sm text-gray-600">
          {changed.length === 0 ? (
            <>Editing these updates the live site immediately. {settings.length} fields.</>
          ) : (
            <span className="font-semibold text-amber-700">
              {changed.length} unsaved {changed.length === 1 ? "change" : "changes"}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDraft({})}
            disabled={changed.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
            Discard
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={saveAll}
            disabled={changed.length === 0 || saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-medical-500/20 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Publish changes
          </button>
        </div>
      </div>

      {grouped.map(([group, items]) => (
        <section key={group} className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
            {groupTitle(group)}
          </h2>
          <div className="space-y-5">
            {items.map((s) => {
              const isDirty = s.id in draft && draft[s.id] !== (s.value ?? "");
              const set = (v: string) => setDraft((d) => ({ ...d, [s.id]: v }));
              return (
                <div key={s.id} className="grid gap-2 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-6">
                  <div className="pt-1.5">
                    <label
                      htmlFor={`setting-${s.id}`}
                      className="block text-sm font-semibold text-gray-800"
                    >
                      {s.label}
                      {isDirty && <span className="ml-2 text-xs font-bold text-amber-600">edited</span>}
                    </label>
                    {s.help && <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{s.help}</p>}
                    <code className="mt-1 block text-[10px] text-gray-400">{s.key}</code>
                  </div>

                  <div>
                    {s.value_type === "boolean" ? (
                      <button
                        id={`setting-${s.id}`}
                        type="button"
                        role="switch"
                        aria-checked={current(s) === "true"}
                        onClick={() => set(current(s) === "true" ? "false" : "true")}
                        className={`relative h-7 w-12 rounded-full transition-colors ${
                          current(s) === "true" ? "bg-medical-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            current(s) === "true" ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    ) : s.value_type === "longtext" ? (
                      <textarea
                        id={`setting-${s.id}`}
                        rows={3}
                        value={current(s)}
                        onChange={(e) => set(e.target.value)}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20 ${
                          isDirty ? "border-amber-300 bg-amber-50/40" : "border-gray-200"
                        }`}
                      />
                    ) : (
                      <input
                        id={`setting-${s.id}`}
                        type={s.value_type === "number" ? "number" : "text"}
                        inputMode={s.value_type === "number" ? "numeric" : undefined}
                        value={current(s)}
                        onChange={(e) => set(e.target.value)}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20 ${
                          isDirty ? "border-amber-300 bg-amber-50/40" : "border-gray-200"
                        }`}
                      />
                    )}

                    {(s.value_type === "image" || s.value_type === "url") && current(s) && (
                      <p className="mt-1.5 truncate text-xs text-gray-400">
                        Points at {current(s)}
                      </p>
                    )}
                    {s.value_type === "image" && current(s) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={current(s)}
                        alt=""
                        className="mt-2 h-20 rounded-lg border border-gray-200 object-cover"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
