"use client";

import { useState } from "react";
import { Check, Loader2, Phone } from "lucide-react";
import { useContactInfo } from "@/hooks/useContactInfo";
import { ATTEMPTS } from "@/lib/counsellingOptions";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

/**
 * What the seat list cannot tell you, and the two questions we still need.
 *
 * The data answers one question well — which seats a rank has historically
 * reached. It answers none of the questions that actually cost people a year,
 * and those are the counselling. Saying so plainly is both true and the whole
 * argument for picking up the phone; it is also the opposite of the "95%
 * accuracy" claims this site removed, because it describes a limit rather than
 * inventing a certainty.
 *
 * It collects the last two profile fields here rather than in the tuner because
 * neither changes anything on screen. Attempt and MBBS college tell a counsellor
 * who they are talking to, and asking for them at the point where the visitor is
 * requesting a call is the one place they are obviously relevant.
 */

/** The questions published closing ranks genuinely cannot answer. */
const OPEN_QUESTIONS = [
  "In what order to fill your choice list — the same seats in a different order is a different result.",
  "Whether to float or freeze once you hold a seat. Give one up and you cannot take it back.",
  "Whether your home-state quota beats All India for your rank, which is often the cheaper seat.",
  "Which documents your state's counselling will stop you on, and by when.",
];

export default function CounsellingCTA({
  /** Something true about what they are looking at, e.g. "47 seats are in reach at your rank". */
  headline,
  source,
  className = "",
}: {
  headline?: string;
  source: string;
  className?: string;
}) {
  const { contactInfo } = useContactInfo();
  const [attempt, setAttempt] = useState("");
  const [college, setCollege] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "sent">("idle");

  const wa = (contactInfo?.whatsapp_number ?? "").replace(/[^\d]/g, "");

  const message = encodeURIComponent(
    "Hi, I would like admission counselling guidance." +
      (attempt ? `\nAttempt: ${attempt}` : "") +
      (college.trim() ? `\nMBBS from: ${college.trim()}` : ""),
  );

  /**
   * Save the two fields, then hand over to WhatsApp.
   *
   * The save is awaited rather than fired and forgotten: the visitor is about to
   * leave for another app, and a request cancelled by that navigation is the
   * commonest way an answer is collected on screen and never arrives.
   */
  const submit = async (then: "whatsapp" | "call") => {
    setState("saving");
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt: attempt || undefined,
          mbbsCollege: college.trim() || undefined,
          notify: true,
          source: `Counselling request — ${source}`,
        }),
      });
    } catch {
      // Still let them through. A failed save must not block somebody asking
      // for help; the enquiry and the phone number are already recorded.
    }
    setState("sent");

    if (then === "whatsapp" && wa) {
      window.open(`https://wa.me/${wa}?text=${message}`, "_blank", "noopener,noreferrer");
    } else if (then === "call" && contactInfo?.phone_number) {
      window.location.href = `tel:${contactInfo.phone_number}`;
    }
  };

  return (
    <section
      className={`rounded-2xl border border-border bg-surface-2 p-5 sm:p-7 ${className}`}
      aria-labelledby="counselling-cta-heading"
    >
      <h2
        id="counselling-cta-heading"
        className="font-heading text-xl font-extrabold leading-snug text-foreground sm:text-2xl"
      >
        {headline ?? "You have the seats. The order is the hard part."}
      </h2>
      <p className="mt-2 max-w-[68ch] text-[14.5px] leading-relaxed text-muted-foreground">
        Everything above is what the counselling authorities published. It is real, and it is only
        half the decision — these are the parts no table can answer:
      </p>

      <ul className="mt-4 space-y-2.5">
        {OPEN_QUESTIONS.map((q) => (
          <li key={q} className="flex gap-2.5 text-[14px] leading-relaxed text-foreground">
            <Check className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>{q}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="cta-attempt"
            className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Which attempt is this?
          </label>
          <select
            id="cta-attempt"
            value={attempt}
            onChange={(e) => setAttempt(e.target.value)}
            className="mt-1.5 h-12 w-full rounded-xl border border-border bg-card px-3 text-[15px] text-foreground outline-none focus:border-primary"
          >
            <option value="">Select</option>
            {ATTEMPTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="cta-college"
            className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Where did you do MBBS?
          </label>
          <input
            id="cta-college"
            type="text"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            placeholder="College and city"
            className="mt-1.5 h-12 w-full rounded-xl border border-border bg-card px-3 text-[15px] text-foreground outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => void submit("whatsapp")}
          disabled={state === "saving"}
          className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-60"
        >
          {state === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <WhatsAppIcon className="h-4 w-4" />
          )}
          Talk on WhatsApp
        </button>
        <button
          type="button"
          onClick={() => void submit("call")}
          disabled={state === "saving"}
          className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-[15px] font-bold text-foreground transition-colors hover:border-primary disabled:opacity-60"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Request a call back
        </button>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        {state === "sent"
          ? "Sent — a counsellor has your details and will come back to you."
          : "A counsellor sees your rank, category and preferences, so you will not be asked for them again."}
      </p>
    </section>
  );
}
