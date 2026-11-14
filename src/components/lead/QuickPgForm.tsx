"use client";

import { useId, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { checkPhone } from "@/lib/phone";
import { checkName } from "@/lib/formRules";
import { checkRank } from "@/lib/neetLimits";
import { trackLead } from "@/lib/analytics";

export interface QuickFormCopy {
  name: string;
  phone: string;
  rank: string;
  rank_hint: string;
  button: string;
  done: string;
  privacy: string;
  /** With `chooseLevel`: the two choices and the UG rank field. */
  level_ug?: string;
  level_pg?: string;
  rank_ug?: string;
}

/**
 * Three fields — name, mobile, NEET PG rank (optional) — on one row from a laptop up, stacked on a phone. Posts to
 * /api/leads as a PG enquiry with the page as its source, so the counsellor knows which college or page it came from.
 * The same rules the server applies (lib/phone, lib/formRules, lib/neetLimits), said while they can still be fixed.
 * The rank never goes to analytics — trackLead sends its band only.
 */
export default function QuickPgForm({
  source,
  copy,
  waHref,
  chooseLevel = false,
  stacked = false,
  defaultLevel = "pg",
  formName = "quick_pg_form",
}: {
  source: string;
  copy: QuickFormCopy;
  waHref: string;
  /** NEET UG / NEET PG choice above the fields (the homepage, 2026-11-14: 8 of 12 competitors had a form there). */
  chooseLevel?: boolean;
  /** One column at every width, for a narrow card. */
  stacked?: boolean;
  defaultLevel?: "ug" | "pg";
  formName?: string;
}) {
  const id = useId();
  const [level, setLevel] = useState<"ug" | "pg">(chooseLevel ? defaultLevel : "pg");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rank, setRank] = useState("");
  const rankLabel = level === "ug" ? copy.rank_ug || "NEET UG rank (AIR)" : copy.rank;
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    const n = checkName(name);
    if (!n.ok) return setError(n.error);
    const p = checkPhone(phone, { allowInternational: true });
    if (!p.ok) return setError(p.error);
    if (rank.trim()) {
      const r = checkRank(rank, level);
      if (!r.ok) return setError(r.error);
    }
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, rank: rank.trim() || undefined, level, source, honeypot: trap }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Could not send. Please try again.");
      setState("done");
      trackLead({ form: formName, course: level === "ug" ? "mbbs" : "pg", rank: rank.trim() || undefined });
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Could not send. Please try again.");
    }
  };

  if (state === "done") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-4 text-[14.5px] text-foreground" role="status">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <p>
          {copy.done}{" "}
          <a href={waHref} target="_blank" rel="noopener" data-placement="quick_form_done" className="font-semibold text-primary-strong underline-offset-2 hover:underline dark:text-primary">
            WhatsApp
          </a>
        </p>
      </div>
    );
  }

  const input =
    "min-h-12 w-full rounded-xl border border-border bg-background px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 md:text-[14.5px]";
  return (
    <form onSubmit={submit} noValidate className="space-y-2">
      <input type="text" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {chooseLevel && (
        <div role="radiogroup" aria-label="Which counselling" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {(["ug", "pg"] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              onClick={() => setLevel(l)}
              className={`min-h-11 rounded-lg px-3 text-[14px] font-bold transition-colors ${level === l ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l === "ug" ? copy.level_ug || "NEET UG (MBBS / BDS)" : copy.level_pg || "NEET PG (MD / MS)"}
            </button>
          ))}
        </div>
      )}
      <div className={stacked ? "grid gap-2" : "grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"}>
        <label className="sr-only" htmlFor={`${id}-name`}>{copy.name}</label>
        <input id={`${id}-name`} className={input} placeholder={copy.name} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="sr-only" htmlFor={`${id}-phone`}>{copy.phone}</label>
        <input id={`${id}-phone`} className={input} type="tel" inputMode="tel" autoComplete="tel" placeholder={copy.phone} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label className="sr-only" htmlFor={`${id}-rank`}>{rankLabel}</label>
        <input
          id={`${id}-rank`}
          data-aa-mask
          className={input}
          inputMode="numeric"
          placeholder={rankLabel}
          aria-describedby={`${id}-hint`}
          value={rank}
          onChange={(e) => setRank(e.target.value.replace(/[^\d,]/g, ""))}
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary-strong px-5 text-[15px] font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-70"
        >
          {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {copy.button}
        </button>
      </div>
      <p id={`${id}-hint`} className="text-[12.5px] text-muted-foreground">
        {copy.rank_hint} {copy.privacy}
      </p>
      {error && (
        <p className="text-[13.5px] font-semibold text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
