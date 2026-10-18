"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Save, SlidersHorizontal, Undo2 } from "lucide-react";
import {
  Badge, Button, Card, EmptyState, Field, INPUT, INPUT_H, Notice, TEXTAREA,
} from "@/components/admin/ui";

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

// An edited field is tinted amber until it is published. Swapped into the kit's
// classes rather than appended, because two border colours on one element
// resolve by stylesheet order, not by the order they are written in.
const edited = (cls: string, dirty: boolean) =>
  dirty ? cls.replace("border-slate-200", "border-amber-300").replace("bg-white", "bg-amber-50/50") : cls;

export default function SettingsEditor() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load the settings");
      const { data } = await res.json();
      setSettings(data);
      setDraft({});
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load the settings";
      toast.error(message);
      setLoadError(message);
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

  if (loading && settings.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const isDirty = (s: Setting) => s.id in draft && draft[s.id] !== (s.value ?? "");

  return (
    <div className="space-y-5">
      {loadError && (
        <Notice
          tone="danger"
          title="The settings did not load"
          action={
            <Button size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          }
        >
          {loadError}
        </Notice>
      )}

      {settings.length === 0 ? (
        !loadError && (
          <Card>
            <EmptyState
              icon={SlidersHorizontal}
              title="No settings yet"
              hint="Settings are added by the seed script. Until then the site shows its built-in text."
            />
          </Card>
        )
      ) : (
        <>
          {/* Save bar. Sticks under the admin's 64px top bar so Publish is always in reach. */}
          <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="min-w-0 text-sm text-slate-600">
              {changed.length === 0 ? (
                <>{settings.length} fields. Edit any of them, then publish to update the live site.</>
              ) : (
                <Badge tone="warning">
                  {changed.length} unsaved {changed.length === 1 ? "change" : "changes"}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setDraft({})} disabled={changed.length === 0}>
                <Undo2 className="h-4 w-4" />
                Discard
              </Button>
              <Button size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" variant="primary" onClick={saveAll} disabled={changed.length === 0 || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Publish changes
              </Button>
            </div>
          </div>

          {/* Locked while a reload is in flight: the reload clears the draft, so
              anything typed during it would be thrown away. */}
          <fieldset disabled={loading} className="min-w-0 space-y-5">
          {grouped.map(([group, items]) => {
            const editedHere = items.filter(isDirty).length;
            return (
              <Card
                key={group}
                title={groupTitle(group)}
                actions={
                  editedHere > 0 ? (
                    <Badge tone="warning">{editedHere} edited</Badge>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {items.length} {items.length === 1 ? "field" : "fields"}
                    </span>
                  )
                }
              >
                <div className="grid grid-cols-1 items-start gap-x-6 gap-y-5 lg:grid-cols-2">
                  {items.map((s) => {
                    const dirty = isDirty(s);
                    const set = (v: string) => setDraft((d) => ({ ...d, [s.id]: v }));
                    const value = current(s);
                    const on = value === "true";
                    return (
                      <Field
                        key={s.id}
                        htmlFor={`setting-${s.id}`}
                        className={`min-w-0 ${s.value_type === "longtext" ? "lg:col-span-2" : ""}`}
                        label={
                          <span className="flex flex-wrap items-center gap-2">
                            {s.label}
                            {dirty && <Badge tone="warning">Edited</Badge>}
                          </span>
                        }
                        hint={
                          <>
                            {s.help && <span className="block">{s.help}</span>}
                            {(s.value_type === "image" || s.value_type === "url") && value && (
                              <span className="block truncate">Points at {value}</span>
                            )}
                            <code className="mt-0.5 block truncate text-[11px] text-slate-400">{s.key}</code>
                          </>
                        }
                      >
                        {s.value_type === "boolean" ? (
                          <div className="flex h-10 items-center gap-3">
                            <button
                              id={`setting-${s.id}`}
                              type="button"
                              role="switch"
                              aria-checked={on}
                              onClick={() => set(on ? "false" : "true")}
                              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
                                on ? "bg-cyan-600" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                  on ? "left-[22px]" : "left-0.5"
                                }`}
                              />
                            </button>
                            <span className="text-sm text-slate-600">{on ? "On" : "Off"}</span>
                          </div>
                        ) : s.value_type === "longtext" ? (
                          <textarea
                            id={`setting-${s.id}`}
                            rows={3}
                            value={value}
                            onChange={(e) => set(e.target.value)}
                            className={edited(TEXTAREA, dirty)}
                          />
                        ) : (
                          <input
                            id={`setting-${s.id}`}
                            type={s.value_type === "number" ? "number" : "text"}
                            inputMode={s.value_type === "number" ? "numeric" : undefined}
                            value={value}
                            onChange={(e) => set(e.target.value)}
                            className={`${edited(INPUT, dirty)} ${INPUT_H}`}
                          />
                        )}

                        {s.value_type === "image" && value && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={value}
                            alt=""
                            className="mt-2 h-20 max-w-full rounded-lg border border-slate-200 object-cover"
                          />
                        )}
                      </Field>
                    );
                  })}
                </div>
              </Card>
            );
          })}
          </fieldset>
        </>
      )}
    </div>
  );
}
