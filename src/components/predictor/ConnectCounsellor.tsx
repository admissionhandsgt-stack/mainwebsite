"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, PhoneCall } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { checkPhone } from "@/lib/phone";
import { checkName } from "@/lib/formRules";
import { BUDGET_BANDS } from "@/lib/counsellingOptions";
import { CONTACT_INFO, OFFICE } from "@/lib/constants";

/**
 * The step after the preview: the closing ranks and fees behind each college
 * are what a counsellor goes through with the family, so this asks for what a
 * counsellor needs to ring back prepared — and nothing the tool already knows.
 *
 * Rank, category, course and the result counts travel with the enquiry, so the
 * call opens on the shortlist rather than on "what was your rank?". Sign-in
 * codes are paused while the WhatsApp sender is down (2026-10-11); this needs
 * no code, because the phone number is the counsellor's to call, not a login.
 */
export default function ConnectCounsellor({
  level,
  courseLabel,
  rank,
  category,
  counts,
  states,
  branches,
  seatType,
}: {
  level: "ug" | "pg";
  courseLabel: string;
  rank: number;
  category: string;
  counts: Record<"safe" | "likely" | "possible" | "stretch", number>;
  states: string[];
  branches: string[];
  seatType: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [budget, setBudget] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");

  const summary =
    `Seat predictor (${courseLabel}): rank ${rank.toLocaleString("en-IN")}, ${category}. ` +
    `Reach — safe ${counts.safe}, likely ${counts.likely}, possible ${counts.possible}, stretch ${counts.stretch}.` +
    (budget ? ` Budget: ${budget}.` : "") +
    (seatType && seatType !== "all" ? ` Seat type: ${seatType}.` : "");

  const waText = encodeURIComponent(
    `Hello AdmissionHands, I checked the seat predictor — ${courseLabel}, rank ${rank.toLocaleString("en-IN")}, ${category}. ` +
      "Please share the closing ranks and fees for my colleges.",
  );
  const waNumber = CONTACT_INFO.whatsapp.replace(/\D/g, "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = checkName(name);
    if (!n.ok) return setError(n.error);
    const p = checkPhone(phone);
    if (!p.ok) return setError(p.error);
    setError(null);
    setStatus("saving");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: n.value,
          phone: p.e164,
          rank,
          category,
          level,
          preferred_state: state || undefined,
          preferred_branch: branches.length ? branches.join(", ") : undefined,
          quota_interest: seatType && seatType !== "all" ? seatType : undefined,
          message: summary,
          source: `Seat predictor (${courseLabel}) — counsellor call`,
          honeypot,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("idle");
        return setError(json.error || "Could not send. Try again, or message us on WhatsApp.");
      }
      setStatus("done");
    } catch {
      setStatus("idle");
      setError("Could not send. Check your connection, or message us on WhatsApp.");
    }
  }

  if (status === "done") {
    return (
      <div className="mt-6 rounded-2xl border border-accent/30 bg-accent-soft p-6 text-center md:p-8">
        <CheckCircle2 className="mx-auto h-10 w-10 text-accent" aria-hidden="true" />
        <h3 className="font-heading mt-3 text-xl font-extrabold text-foreground">A counsellor will call you</h3>
        <p className="mx-auto mt-2 max-w-[46ch] text-[14.5px] leading-relaxed text-muted-foreground">
          They will have your rank, category and these results in front of them — with the closing rank and fee for
          each college. We call {OFFICE.hoursShort}.
        </p>
        <a
          href={`https://wa.me/${waNumber}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-[15px] font-bold text-white hover:bg-[#1fbf5b]"
        >
          <WhatsAppIcon className="h-5 w-5" /> Prefer WhatsApp? Message us now
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mt-6 overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-lift"
      aria-labelledby="connect-h"
    >
      <div className="grid gap-px bg-border md:grid-cols-5">
        <div className="bg-surface-2 p-6 md:col-span-2 md:p-8">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary-strong">
            <PhoneCall className="h-3 w-3" aria-hidden="true" /> Free counsellor call
          </p>
          <h3 id="connect-h" className="font-heading mt-3 text-[1.4rem] font-extrabold leading-tight text-foreground">
            Get the exact closing ranks, fees and your choice-filling order
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            A counsellor goes through every college above with you — which quota, what it costs, and the order to fill
            them in. Your rank and category are already attached.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
            <div className="rounded-xl border border-border bg-card px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Rank</dt>
              <dd className="tnum font-bold text-foreground">{rank.toLocaleString("en-IN")}</dd>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Course · category</dt>
              <dd className="font-bold text-foreground">
                {courseLabel} · {category}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-card p-6 md:col-span-3 md:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] font-semibold text-foreground">Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="mt-1.5 h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Student or parent"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-foreground">Mobile number</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                className="tnum mt-1.5 h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="10-digit mobile"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-foreground">Preferred state</span>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1.5 h-12 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-primary"
              >
                <option value="">Any state</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-foreground">Budget a year</span>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="mt-1.5 h-12 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-primary"
              >
                <option value="">Not sure yet</option>
                {BUDGET_BANDS.map((b) => (
                  <option key={b.id} value={b.label}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {/* Hidden from people; bots fill it in. */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            aria-hidden="true"
          />
          {error && (
            <p role="alert" className="mt-3 text-[13.5px] font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={status === "saving"}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-70"
            >
              {status === "saving" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <PhoneCall className="h-5 w-5" aria-hidden="true" />}
              Call me back
            </button>
            <a
              href={`https://wa.me/${waNumber}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-6 text-[15px] font-bold text-[#128C7E] hover:bg-[#25D366]/15 dark:text-[#25D366]"
            >
              <WhatsAppIcon className="h-5 w-5" /> WhatsApp us
            </a>
          </div>
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            No payment, no sign-in. We call {OFFICE.hoursShort}.
          </p>
        </div>
      </div>
    </form>
  );
}
