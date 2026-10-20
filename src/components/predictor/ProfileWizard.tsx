"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import BranchPicker from "@/components/predictor/BranchPicker";
import {
  BUDGET_BANDS,
  MAX_BRANCHES,
  TOTAL_BUDGET_BANDS,
  type CounsellingProfile,
  type Stream,
} from "@/lib/counsellingOptions";
import type { StreamFacets } from "./chanceTypes";

/**
 * The last screen before the colleges: only what changes the list (2026-10-20).
 *
 * It used to be four steps — gender, PwD, city, attempt, college types, states,
 * a budget a year and "what the family can raise in total", seat types, a
 * guardian's phone — and the owner's verdict was that students leave before the
 * end. Now it is one screen: the domicile state and the fee a year for MBBS/BDS,
 * plus the branches (and, optionally, the MBBS state) for PG. Everything else a
 * counsellor asks on the call. The count above the card still moves with each
 * answer, and the answers are saved when the screen is submitted
 * (POST /api/profile). Draft keeps every field so a returning student's older
 * answers are carried, not wiped.
 */

/** What the form holds — budgets as band ids, the way the API wants them. */
export interface Draft {
  name: string;
  gender: string;
  pwd: "" | "yes" | "no";
  domicileState: string;
  city: string;
  neetScore: string;
  attempt: string;
  preferredStates: string[];
  anywhere: boolean;
  collegeTypes: string[];
  seatTypes: string[];
  budget: string;
  budgetTotal: string;
  branches: string[];
  mbbsCollege: string;
  mbbsState: string;
  internshipStatus: string;
  serviceQuota: "" | "yes" | "no";
  bondOk: string;
  guardianPhone: string;
}

const bandId = (max: number | null | undefined, list: readonly { id: string; max: number | null }[]) =>
  max === undefined || max === null ? "" : list.find((b) => b.max === max)?.id ?? "";

export function draftFrom(p: CounsellingProfile | null, name: string | null): Draft {
  return {
    name: p?.name ?? name ?? "",
    gender: p?.gender ?? "",
    pwd: p?.pwd == null ? "" : p.pwd ? "yes" : "no",
    domicileState: p?.domicileState ?? p?.preferredState ?? "",
    city: p?.city ?? "",
    neetScore: p?.neetScore == null ? "" : String(p.neetScore),
    attempt: p?.attempt ?? "",
    preferredStates: p?.preferredStates ?? [],
    anywhere: !p?.preferredStates?.length,
    collegeTypes: p?.collegeTypes ?? [],
    seatTypes: p?.seatTypes ?? [],
    budget: bandId(p?.budgetMax, BUDGET_BANDS),
    budgetTotal: bandId(p?.budgetTotalMax, TOTAL_BUDGET_BANDS),
    branches: p?.preferredBranches ?? [],
    mbbsCollege: p?.mbbsCollege ?? "",
    mbbsState: p?.mbbsState ?? "",
    internshipStatus: p?.internshipStatus ?? "",
    serviceQuota: p?.serviceQuota == null ? "" : p.serviceQuota ? "yes" : "no",
    bondOk: p?.bondOk ?? "",
    guardianPhone: p?.guardianPhone ?? "",
  };
}

/** Whether the questions that decide the list have been answered. */
export function essentialsDone(stream: Stream, d: Draft): boolean {
  if (!d.domicileState || !d.budget) return false;
  if (stream === "pg") return d.branches.length > 0;
  return true;
}

/** The body /api/profile takes for the given fields. */
export function payload(d: Draft, keys: (keyof Draft)[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = d[k];
    if (k === "branches") out.preferredBranches = v;
    else if (k === "preferredStates") out.preferredStates = d.anywhere ? [] : v;
    else if (k === "anywhere") continue;
    else if (Array.isArray(v) ? v.length : v !== "") out[k] = v;
  }
  return out;
}

/** What the one screen asks, course by course. */
const KEYS: Record<Stream, (keyof Draft)[]> = {
  mbbs: ["domicileState", "budget"],
  bds: ["domicileState", "budget"],
  pg: ["domicileState", "mbbsState", "branches", "budget"],
};

const field =
  "mt-1.5 h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 text-[14px] font-semibold transition-colors ${
        on
          ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
          : "border-border bg-card text-foreground hover:border-primary/40"
      }`}
    >
      {on && <Check className="h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  );
}

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="text-[13px] font-semibold text-foreground">
      {children}
      {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
    </span>
  );
}

export default function ProfileWizard({
  stream,
  allStates,
  draft,
  setDraft,
  matching,
  counting,
  onStepSaved,
  onFinish,
}: {
  stream: Stream;
  facets: StreamFacets;
  /** Every state, for domicile — not only the ones with seats in this course. */
  allStates: string[];
  draft: Draft;
  setDraft: (d: Draft) => void;
  /** Live count of options matching what has been answered so far. */
  matching: number | null;
  counting: boolean;
  onStepSaved: (fields: Record<string, unknown>, last: boolean) => Promise<void>;
  onFinish: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const pg = stream === "pg";

  const check = (): string | null => {
    if (!draft.domicileState) return "Choose your domicile state.";
    if (pg && draft.branches.length === 0) return "Pick at least one branch.";
    if (!draft.budget) return "Choose the fee you can pay a year.";
    return null;
  };

  const submit = async () => {
    const problem = check();
    if (problem) return setError(problem);
    setError(null);
    setSaving(true);
    try {
      await onStepSaved(payload(draft, KEYS[stream]), true);
      onFinish();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-lift">
      {/* the live count */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2 px-5 py-4 md:px-7">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Last step</p>
        <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground" aria-live="polite">
          {counting ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          )}
          {matching == null ? (
            "Matching your options…"
          ) : (
            <>
              <span className="tnum">{matching.toLocaleString("en-IN")}</span> options match
            </>
          )}
        </p>
      </div>

      <form
        className="p-5 md:p-7"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h2 className="font-heading text-[1.35rem] font-extrabold text-foreground">
          {pg ? "Three quick details" : "Two quick details"}
        </h2>
        <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
          So the list shows seats you can take and can afford. A counsellor asks the rest on the call.
        </p>

        <div className="mt-5 space-y-5">
          <div className={pg ? "grid gap-4 sm:grid-cols-2" : ""}>
            <label className="block">
              <Label>Domicile state</Label>
              <select value={draft.domicileState} onChange={(e) => set("domicileState", e.target.value)} className={field}>
                <option value="">Choose…</option>
                {allStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            {pg && (
              <label className="block">
                <Label optional>State of your MBBS</Label>
                <select value={draft.mbbsState} onChange={(e) => set("mbbsState", e.target.value)} className={field}>
                  <option value="">Choose…</option>
                  {allStates.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {pg && (
            <div>
              <Label>Branches you would take</Label>
              <div className="mt-1.5">
                <BranchPicker value={draft.branches} onChange={(next) => set("branches", next.slice(0, MAX_BRANCHES))} max={MAX_BRANCHES} />
              </div>
            </div>
          )}

          <div>
            <Label>Fee you can pay a year</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {BUDGET_BANDS.map((b) => (
                <Chip key={b.id} on={draft.budget === b.id} onClick={() => set("budget", b.id)}>
                  {b.label.replace(/ a year$/, "")}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-[13.5px] font-medium text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-70 sm:w-auto"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Show my colleges
          {!saving && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </form>
    </div>
  );
}
