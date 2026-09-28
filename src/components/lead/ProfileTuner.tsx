"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { ATTEMPTS, BUDGET_BANDS } from "@/lib/counsellingOptions";

/**
 * Five questions, asked the moment the seats appear.
 *
 * The counsellors need eight things before they can advise anybody, and the gate
 * was collecting two — often one. Asking all eight at the gate would cost more
 * enquiries than it gains detail, so this asks only the ones that **visibly
 * change the answer on screen**: rank, category, branch, home state and budget.
 * Every one of them narrows the list the visitor is already looking at, which
 * makes answering the fastest route to a better result rather than a toll on the
 * way to it.
 *
 * Attempt and MBBS college change nothing here, so they are not here. They are
 * asked in the counselling request, where the visitor is the one asking us for
 * something and the questions are obviously relevant.
 *
 * **Every step is skippable and the answer is saved as you go.** A half-finished
 * profile is worth far more than an abandoned one — three fields from a hundred
 * people beats eight fields from ten.
 */

export interface TunerValue {
  rank?: string;
  category?: string;
  preferredBranch?: string;
  preferredState?: string;
  budget?: string;
}

interface Question {
  key: keyof TunerValue;
  /** Asked in the second person, because it is a conversation. */
  ask: string;
  /** Why answering helps *them*. Never why it helps us. */
  why: string;
  kind: "number" | "choice";
  options?: { id: string; label: string }[];
  placeholder?: string;
}

/** Categories as the data publishes them — GEN in PG, UR in UG. */
const CATEGORIES = ["GEN", "OBC", "SC", "ST", "EWS", "GEN-PwD"];

export default function ProfileTuner({
  level = "pg",
  branches = [],
  states = [],
  initial = {},
  source,
  onDone,
  onSkip,
}: {
  level?: "ug" | "pg";
  /** From the page's own facets, so the list is what the data actually holds. */
  branches?: string[];
  states?: string[];
  initial?: TunerValue;
  /** Where this was answered, for the alert. */
  source: string;
  onDone: (value: TunerValue) => void;
  onSkip?: () => void;
}) {
  const all: Question[] = [
    {
      key: "rank",
      ask: "What is your NEET rank?",
      why: "This is what decides which seats are actually within reach.",
      kind: "number",
      placeholder: "e.g. 38951",
    },
    {
      key: "category",
      ask: "Which category do you apply under?",
      why: "Cut-offs differ by category — a general rank and a reserved one are not the same seat.",
      kind: "choice",
      options: CATEGORIES.map((c) => ({ id: c, label: c })),
    },
    ...(level === "pg" && branches.length
      ? [
          {
            key: "preferredBranch" as const,
            ask: "Which branch are you aiming for?",
            why: "We will lead with those seats instead of all 101 branches.",
            kind: "choice" as const,
            options: branches.slice(0, 14).map((b) => ({ id: b, label: b })),
          },
        ]
      : []),
    ...(states.length
      ? [
          {
            key: "preferredState" as const,
            ask: "Which state is your domicile?",
            why: "Home-state quota is often the cheapest seat you can reach — it is worth checking first.",
            kind: "choice" as const,
            options: states.slice(0, 14).map((s) => ({ id: s, label: s })),
          },
        ]
      : []),
    {
      key: "budget",
      ask: "What can you spend per year?",
      why: "A seat you cannot pay for is not an option. This keeps those out of your list.",
      kind: "choice",
      options: BUDGET_BANDS.map((b) => ({ id: b.id, label: b.label })),
    },
  ];

  /**
   * Never ask what is already known.
   *
   * The predictor arrives here with the rank and category already typed in, and
   * a returning visitor has the whole profile on their account. Re-asking is the
   * fastest way to make a useful step feel like a form.
   */
  const questions = all.filter((q) => {
    const v = initial[q.key];
    return v === undefined || v === null || String(v).trim() === "";
  });

  const [index, setIndex] = useState(0);
  const [value, setValue] = useState<TunerValue>(initial);
  const [typed, setTyped] = useState(initial.rank ?? "");
  const [saving, setSaving] = useState(false);

  const q = questions[index];
  const last = index === questions.length - 1;

  // Everything already known: there is nothing to ask, so nothing renders.
  if (!q) return null;

  /**
   * Save after every answer, not at the end.
   *
   * Somebody who answers three of five and closes the tab has still told us
   * three things, and those three are on the enquiry a counsellor picks up.
   * `notify` only on the last step — five questions must not be five WhatsApp
   * messages about one person, which is how a team stops reading the alerts.
   */
  const persist = async (next: TunerValue, notify: boolean) => {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...next, notify, source }),
      });
    } catch {
      // The answer is already in local state and the result still narrows. A
      // failed save is not worth blocking the person over.
    } finally {
      setSaving(false);
    }
  };

  const advance = async (answer: string | undefined) => {
    const next = { ...value, [q.key]: answer };
    setValue(next);
    await persist(next, last);
    if (last) onDone(next);
    else {
      setIndex(index + 1);
      setTyped("");
    }
  };

  const answered = questions.filter((x) => value[x.key]).length;

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary-soft/40 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-strong dark:text-primary">
            Sharpen your list · {index + 1} of {questions.length}
          </p>
          <h3 className="font-heading mt-1 text-lg font-extrabold leading-snug text-foreground sm:text-xl">
            {q.ask}
          </h3>
          <p className="mt-1 max-w-[56ch] text-[13.5px] leading-relaxed text-muted-foreground">
            {q.why}
          </p>
        </div>
      </div>

      {/* progress — answered, not merely visited */}
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        {questions.map((x, i) => (
          <span
            key={x.key}
            className={`h-1 flex-1 rounded-full transition-colors ${
              value[x.key] ? "bg-primary" : i === index ? "bg-primary/40" : "bg-border"
            }`}
          />
        ))}
      </div>

      <div className="mt-5">
        {q.kind === "number" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim()) void advance(typed.trim());
            }}
            className="flex flex-col gap-2.5 sm:flex-row"
          >
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={q.placeholder}
              aria-label={q.ask}
              className="tnum h-12 flex-1 rounded-xl border border-border bg-card px-4 text-[15px] text-foreground outline-none transition-colors focus:border-primary"
            />
            <button
              type="submit"
              disabled={!typed.trim() || saving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
              Next
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            {q.options!.map((o) => {
              const chosen = value[q.key] === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={saving}
                  onClick={() => void advance(o.id)}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-[13.5px] font-semibold transition-colors disabled:opacity-60 ${
                    chosen
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary-soft"
                  }`}
                >
                  {chosen && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  {o.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground">
          {answered > 0
            ? `${answered} of ${questions.length} answered — your list is already narrower.`
            : "Takes about twenty seconds."}
        </p>
        <button
          type="button"
          onClick={() => (last ? onDone(value) : onSkip ? onSkip() : setIndex(index + 1))}
          className="shrink-0 text-[13px] font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {last ? "Done" : "Skip this"}
        </button>
      </div>
    </div>
  );
}
