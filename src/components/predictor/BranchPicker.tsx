"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

/**
 * Choosing NEET PG branches by their complete names (2026-10-16).
 *
 * Grouped by specialty — "Radio Diagnosis" holds MD Radio Diagnosis, DNB Radio
 * Diagnosis and Diploma in Radio-Diagnosis — because a student thinks in
 * specialties and the course names are long. Search understands the words
 * people actually type (radiology, gynae, ortho, paeds…). The names picked are
 * exactly the catalogue's, so the sheet and the AH Counselor app receive them
 * as they are. List from /api/content/branches (lib/branchCatalogue.ts).
 */

interface Group {
  key: string;
  group?: string;
  variants: string[];
}

/** The words students type, pointed at the specialty they mean. */
const ALIASES: Record<string, string[]> = {
  "Radio Diagnosis": ["radiology", "radio", "imaging", "xray", "x-ray", "mri"],
  "Obstetrics & Gynaecology": ["gynae", "gynaec", "gyne", "obg", "obgy", "obgyn", "gynecology", "obs"],
  ENT: ["ent", "e.n.t", "otorhino", "ear nose throat"],
  Orthopaedics: ["ortho", "orthopedics", "bones"],
  Paediatrics: ["paeds", "peds", "pediatrics", "child health", "child"],
  Dermatology: ["derma", "skin", "dvl", "venereology"],
  Anaesthesiology: ["anaes", "anesthesia", "anesthesiology", "anaesthesia"],
  Psychiatry: ["psych", "psychiatry"],
  "General Medicine": ["medicine", "internal medicine", "gm"],
  "General Surgery": ["surgery", "gs"],
  "Respiratory Medicine (TB & Chest)": ["chest", "tb", "pulmonary", "pulmo", "respiratory", "tuberculosis"],
  Ophthalmology: ["eye", "ophthal", "opthal"],
  "Physical Medicine & Rehabilitation": ["pmr", "rehab", "physical medicine"],
  "Community Medicine": ["psm", "spm", "community", "preventive", "public health"],
  "Emergency Medicine": ["emergency", "casualty", "em"],
  "Radiation Oncology": ["radiotherapy", "radio therapy", "oncology"],
  "Transfusion Medicine": ["blood bank", "ihbt", "immuno haematology"],
  "Hospital Administration": ["hospital admin", "health admin", "mha"],
};

let cache: Group[] | null = null;

export default function BranchPicker({
  value,
  onChange,
  max = 5,
  label = "Branches you would take",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  label?: string;
}) {
  const [groups, setGroups] = useState<Group[] | null>(cache);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (cache) return;
    let live = true;
    fetch("/api/content/branches")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { groups?: Group[] }) => {
        if (!live) return;
        cache = j.groups ?? [];
        setGroups(cache);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const shown = useMemo(() => {
    const all = groups ?? [];
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all
      .map((g) => {
        const hitGroup = g.key.toLowerCase().includes(t) || (ALIASES[g.key] ?? []).some((a) => a.includes(t) || t.includes(a));
        const variants = hitGroup ? g.variants : g.variants.filter((v) => v.toLowerCase().includes(t));
        return { ...g, variants };
      })
      .filter((g) => g.variants.length);
  }, [groups, q]);

  const full = value.length >= max;
  const toggle = (name: string) => {
    if (value.includes(name)) onChange(value.filter((v) => v !== name));
    else if (!full) onChange([...value, name]);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-foreground">{label}</span>
        <span className={`text-xs tnum ${full ? "font-semibold text-signal-borderline" : "text-muted-foreground"}`}>
          {value.length}/{max}
        </span>
      </div>

      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Chosen branches">
          {value.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => toggle(v)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground"
              >
                {v}
                <X className="h-3.5 w-3.5" aria-label={`Remove ${v}`} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(null);
          }}
          placeholder="Search — radiology, gynae, ortho, paeds…"
          aria-label="Search branches"
          className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-[15px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="mt-2 max-h-[22rem] overflow-y-auto rounded-xl border border-border">
        {!groups && !failed && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading branches…</p>}
        {failed && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Could not load the branch list. Please try again.</p>}
        {groups && shown.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No branch matches “{q}”.</p>
        )}
        <ul className="divide-y divide-border">
          {shown.map((g) => {
            const picked = g.variants.filter((v) => value.includes(v)).length;
            const isOpen = open === g.key || !!q.trim() || g.variants.length === 1;
            return (
              <li key={g.key}>
                {g.variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOpen(open === g.key ? null : g.key)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold text-foreground">{g.key}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {g.variants.length} courses{g.group ? ` · ${g.group}` : ""}
                      </span>
                    </span>
                    {picked > 0 && (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-strong tnum">{picked}</span>
                    )}
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                )}
                {isOpen && (
                  <ul className={g.variants.length > 1 ? "bg-surface-2/60 pb-2" : ""}>
                    {g.variants.map((v) => {
                      const on = value.includes(v);
                      return (
                        <li key={v}>
                          <button
                            type="button"
                            onClick={() => toggle(v)}
                            disabled={!on && full}
                            aria-pressed={on}
                            className={`flex w-full items-center gap-3 py-2.5 pr-4 text-left text-[14px] disabled:opacity-40 ${
                              g.variants.length > 1 ? "pl-7" : "pl-4"
                            } ${on ? "font-semibold text-primary-strong" : "text-foreground hover:bg-surface-2"}`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                              }`}
                            >
                              {on && <Check className="h-3.5 w-3.5" />}
                            </span>
                            {v}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {full && <p className="mt-1.5 text-xs text-muted-foreground">That is {max} — remove one to choose another.</p>}
    </div>
  );
}
