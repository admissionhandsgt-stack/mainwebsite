"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import MultiSelect from "@/components/predictor/MultiSelect";
import BranchPicker from "@/components/predictor/BranchPicker";
import { checkScore } from "@/lib/neetLimits";
import { checkName } from "@/lib/formRules";
import { checkPhone } from "@/lib/phone";
import {
  ATTEMPTS,
  BOND_OPTIONS,
  BUDGET_BANDS,
  COLLEGE_TYPES,
  GENDERS,
  INTERNSHIP,
  MAX_BRANCHES,
  MAX_STATES,
  SEAT_INTERESTS,
  TOTAL_BUDGET_BANDS,
  type CounsellingProfile,
  type Stream,
} from "@/lib/counsellingOptions";
import type { StreamFacets } from "./chanceTypes";

/**
 * The questions, a few at a time, each one visibly narrowing the list.
 *
 * Course by course, because a PG counsellor needs the MBBS state, internship
 * and branches, and an MBBS counsellor needs none of those. Every step is saved
 * as it is answered (POST /api/profile), so somebody who stops halfway has
 * still told us something — and the count above the card moves with each
 * answer, which is what makes the next question worth answering.
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
  if (!d.gender || !d.domicileState || !d.budget) return false;
  if (stream === "pg") return Boolean(d.mbbsState && d.internshipStatus && d.branches.length);
  return true;
}

/** The body /api/profile takes for the fields one step covers. */
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

type StepId = "you" | "branches" | "where" | "budget" | "family";

const STEPS: Record<Stream, StepId[]> = {
  mbbs: ["you", "where", "budget", "family"],
  bds: ["you", "where", "budget", "family"],
  pg: ["you", "branches", "where", "budget"],
};

const STEP_TITLE: Record<StepId, { title: string; why: string }> = {
  you: { title: "About you", why: "Quotas depend on your domicile, gender and PwD status — they change which seats are yours to take." },
  branches: { title: "Branches you would take", why: "Pick up to five. Nobody aims at one, and a shortlist built on one is the wrong shortlist." },
  where: { title: "Where you would study", why: "States and college types you would genuinely join. Leave it open to see all of India." },
  budget: { title: "What you can pay", why: "Per year and in total — they are different answers, and the difference decides whether a seat is real." },
  family: { title: "Almost done", why: "Optional, but it means a counsellor can reach the right person first time." },
};

const STEP_KEYS: Record<StepId, (keyof Draft)[]> = {
  you: ["name", "gender", "pwd", "domicileState", "city", "neetScore", "attempt", "mbbsCollege", "mbbsState", "internshipStatus", "serviceQuota"],
  branches: ["branches"],
  where: ["preferredStates", "anywhere", "collegeTypes", "bondOk"],
  budget: ["budget", "budgetTotal", "seatTypes"],
  family: ["guardianPhone"],
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
  facets,
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
  const steps = STEPS[stream];
  const [i, setI] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const step = steps[i];
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const toggle = (k: "collegeTypes" | "seatTypes" | "branches", v: string, max = 10) => {
    const cur = draft[k];
    set(k, cur.includes(v) ? cur.filter((x) => x !== v) : cur.length >= max ? cur : [...cur, v]);
  };

  const collegeTypeChoices = COLLEGE_TYPES;

  const check = (): string | null => {
    if (step === "you") {
      if (draft.name) {
        const n = checkName(draft.name);
        if (!n.ok) return n.error;
      }
      if (!draft.gender) return "Choose your gender — some quotas are for women only.";
      if (!draft.domicileState) return "Choose your domicile state.";
      if (draft.neetScore) {
        const s = checkScore(draft.neetScore, stream === "pg" ? "pg" : "ug");
        if (!s.ok) return s.error;
      }
      if (stream === "pg" && !draft.mbbsState) return "Choose the state you did your MBBS in.";
      if (stream === "pg" && !draft.internshipStatus) return "Tell us where your internship stands.";
    }
    if (step === "branches" && draft.branches.length === 0) return "Pick at least one branch.";
    if (step === "budget" && !draft.budget) return "Choose what you can pay each year.";
    if (step === "family" && draft.guardianPhone) {
      const p = checkPhone(draft.guardianPhone);
      if (!p.ok) return p.error;
    }
    return null;
  };

  const next = async () => {
    const problem = check();
    if (problem) return setError(problem);
    setError(null);
    setSaving(true);
    const last = i === steps.length - 1;
    try {
      await onStepSaved(payload(draft, STEP_KEYS[step]), last);
      if (last) onFinish();
      else setI(i + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-lift">
      {/* progress + the live count */}
      <div className="border-b border-border bg-surface-2 px-5 py-4 md:px-7">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Step {i + 1} of {steps.length}
          </p>
          <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground" aria-live="polite">
            {counting ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
            {matching == null ? "Matching your options…" : (
              <>
                <span className="tnum">{matching.toLocaleString("en-IN")}</span> options match so far
              </>
            )}
          </p>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          {steps.map((s, n) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${n <= i ? "bg-gradient-brand" : "bg-border"}`} />
          ))}
        </div>
      </div>

      <form
        className="p-5 md:p-7"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <h2 className="font-heading text-[1.35rem] font-extrabold text-foreground">{STEP_TITLE[step].title}</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{STEP_TITLE[step].why}</p>

        <div className="mt-5 space-y-5">
          {step === "you" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <Label>Your name</Label>
                  <input value={draft.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" className={field} placeholder="Student's name" />
                </label>
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
              </div>
              <div>
                <Label>Gender</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {GENDERS.map((g) => (
                    <Chip key={g} on={draft.gender === g} onClick={() => set("gender", g)}>
                      {g}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <Label>Person with disability (PwD) certificate?</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <Chip on={draft.pwd === "no"} onClick={() => set("pwd", "no")}>No</Chip>
                  <Chip on={draft.pwd === "yes"} onClick={() => set("pwd", "yes")}>Yes</Chip>
                </div>
              </div>
              {stream === "pg" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <Label>MBBS college</Label>
                    <input value={draft.mbbsCollege} onChange={(e) => set("mbbsCollege", e.target.value)} className={field} placeholder="Where you did MBBS" />
                  </label>
                  <label className="block">
                    <Label>State of your MBBS</Label>
                    <select value={draft.mbbsState} onChange={(e) => set("mbbsState", e.target.value)} className={field}>
                      <option value="">Choose…</option>
                      {allStates.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {stream === "pg" && (
                <>
                  <div>
                    <Label>Internship</Label>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {INTERNSHIP.map((s) => (
                        <Chip key={s} on={draft.internshipStatus === s} onClick={() => set("internshipStatus", s)}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label optional>In-service candidate (state government doctor)?</Label>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <Chip on={draft.serviceQuota === "no"} onClick={() => set("serviceQuota", "no")}>No</Chip>
                      <Chip on={draft.serviceQuota === "yes"} onClick={() => set("serviceQuota", "yes")}>Yes</Chip>
                    </div>
                  </div>
                </>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <Label optional>NEET score</Label>
                  <input value={draft.neetScore} onChange={(e) => set("neetScore", e.target.value)} inputMode="numeric" className={`tnum ${field}`} placeholder="e.g. 512" />
                </label>
                <label className="block">
                  <Label optional>Attempt</Label>
                  <select value={draft.attempt} onChange={(e) => set("attempt", e.target.value)} className={field}>
                    <option value="">—</option>
                    {ATTEMPTS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <Label optional>City</Label>
                  <input value={draft.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" className={field} placeholder="Where you live" />
                </label>
              </div>
            </>
          )}

          {step === "branches" && (
            <BranchPicker value={draft.branches} onChange={(next) => set("branches", next.slice(0, MAX_BRANCHES))} max={MAX_BRANCHES} />
          )}

          {step === "where" && (
            <>
              <div>
                <Label>States you would study in</Label>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Chip on={draft.anywhere} onClick={() => setDraft({ ...draft, anywhere: true, preferredStates: [] })}>
                    Anywhere in India
                  </Chip>
                  <MultiSelect
                    label={draft.anywhere ? "Or choose states" : `${draft.preferredStates.length}/${MAX_STATES} states`}
                    options={facets.states}
                    selected={draft.preferredStates}
                    onChange={(next) =>
                      setDraft({ ...draft, anywhere: next.length === 0, preferredStates: next.slice(0, MAX_STATES) })
                    }
                  />
                </div>
              </div>
              <div>
                <Label optional>College types you would join</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {collegeTypeChoices.map((t) => (
                    <Chip key={t.id} on={draft.collegeTypes.includes(t.id)} onClick={() => toggle("collegeTypes", t.id)}>
                      {t.label}
                    </Chip>
                  ))}
                </div>
              </div>
              {stream === "pg" && (
                <div>
                  <Label optional>Service bond after PG</Label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {BOND_OPTIONS.map((b) => (
                      <Chip key={b} on={draft.bondOk === b} onClick={() => set("bondOk", b)}>
                        {b}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === "budget" && (
            <>
              <div>
                <Label>Tuition you can pay each year</Label>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  {BUDGET_BANDS.map((b) => (
                    <Chip key={b.id} on={draft.budget === b.id} onClick={() => set("budget", b.id)}>
                      {b.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <Label optional>What the family can raise in total</Label>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  {TOTAL_BUDGET_BANDS.map((b) => (
                    <Chip key={b.id} on={draft.budgetTotal === b.id} onClick={() => set("budgetTotal", b.id)}>
                      {b.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <Label optional>Seat types you would consider</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {SEAT_INTERESTS.map((t) => (
                    <Chip key={t.id} on={draft.seatTypes.includes(t.id)} onClick={() => toggle("seatTypes", t.id)}>
                      {t.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === "family" && (
            <label className="block max-w-sm">
              <Label optional>Parent or guardian&apos;s mobile</Label>
              <input value={draft.guardianPhone} onChange={(e) => set("guardianPhone", e.target.value)} inputMode="tel" autoComplete="tel" className={`tnum ${field}`} placeholder="10-digit mobile" />
            </label>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-[13.5px] font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          {i > 0 ? (
            <button
              type="button"
              onClick={() => setI(i - 1)}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-border px-4 text-[14px] font-semibold text-foreground hover:border-primary/40"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-70"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {i === steps.length - 1 ? "Show my colleges" : "Next"}
            {!saving && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </form>
    </div>
  );
}
