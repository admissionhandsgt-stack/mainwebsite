"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, MessageCircle, ShieldCheck, Loader2, Check } from "lucide-react";
import { useCTA } from "@/hooks/useCTA";

/**
 * The gate over the seat list.
 *
 * It appears only after a search has already returned something, so the
 * visitor is never asked for anything before they know there is an answer —
 * the band counts above this card are complete and free, and three real seats
 * are already on screen. What is being asked for is the rest of a list they
 * can see the size of.
 *
 * Two ways through, and the WhatsApp one is the better of them:
 *
 *   **Verify on WhatsApp** — we hand out a code, their own WhatsApp opens with
 *   the message already written, they send it, and the gateway on the VPS
 *   tells us it arrived. One tap on a phone, and the number is *proved* rather
 *   than typed. Nothing is sent to them, which is what keeps the number safe
 *   (see `src/lib/waVerify.ts`).
 *
 *   **Type a number** — the fallback for anyone not on WhatsApp on this
 *   device. Shape-checked and recorded, not verified.
 */
export default function UnlockCard({
  lockedCount,
  level,
  rank,
  category,
  noun = "seats",
  bare = false,
  alreadyShown = false,
  onUnlocked,
}: {
  lockedCount: number;
  level: "ug" | "pg";
  rank: number;
  category: string;
  /** What is being counted, for pages that list something other than seats. */
  noun?: string;
  /**
   * Drop the card's own border and background.
   *
   * Inside a dialog the surrounding chrome is already there, and a bordered
   * card inside a bordered panel reads as a mistake.
   */
  bare?: boolean;
  /**
   * Whether the visitor has already been shown some of these.
   *
   * "300 more seats" is wrong when none have been shown yet — on the predictor
   * the free answer is the counts, so nothing has been listed. On a college
   * page eight rows are already on screen and "more" is exactly right.
   */
  alreadyShown?: boolean;
  /**
   * Client pages re-run their own fetch. Server-rendered pages have no fetch
   * to re-run, so the default is a refresh — the cookie is set by then, and
   * the server renders the unlocked view.
   */
  onUnlocked?: () => void;
}) {
  const CTA = useCTA();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The WhatsApp path runs as its own little state machine, because the
  // visitor leaves the page to send the message and comes back to it.
  const [wa, setWa] = useState<"idle" | "starting" | "waiting" | "done" | "expired">("idle");
  const [waCode, setWaCode] = useState("");
  const [waLink, setWaLink] = useState("");
  const waToken = useRef<string | null>(null);

  const digits = phone.replace(/\D/g, "");
  const phoneOk = /^[6-9]\d{9}$/.test(digits.length === 12 ? digits.slice(2) : digits);
  const ready = name.trim().length >= 2 && phoneOk;

  const unlocked = useCallback(() => {
    if (onUnlocked) onUnlocked();
    else router.refresh();
  }, [onUnlocked, router]);

  /* ---------------- typed-number path ---------------- */

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, level, rank, category, honeypot }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Could not unlock.");
      unlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- WhatsApp path ---------------- */

  const startWhatsApp = async () => {
    if (wa === "starting" || wa === "waiting") return;
    setWa("starting");
    setError(null);
    try {
      const res = await fetch("/api/verify/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          phone: phoneOk ? phone : null,
          level,
          rank,
          category,
          source: `Seat predictor — ${level.toUpperCase()}`,
          honeypot,
        }),
      });

      // 503 means the verification number is not configured in this
      // environment. Fall back to an ordinary chat rather than a dead button.
      if (res.status === 503) {
        setWa("idle");
        CTA.whatsapp(
          rank > 0
            ? `Hi, I'm looking at NEET ${level.toUpperCase()} seats for rank ${rank.toLocaleString("en-IN")}` +
              `${category ? ` (${category})` : ""}. Please send me the full list.`
            : `Hi, I'm looking at NEET ${level.toUpperCase()} seats. Please send me the full cutoff list.`,
        );
        return;
      }

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Could not start verification.");

      waToken.current = json.token;
      setWaCode(json.code);
      setWaLink(json.waLink);
      setWa("waiting");
      // Their WhatsApp, their message, already written. A new tab rather than
      // a redirect, so the results are still here when they come back.
      window.open(json.waLink, "_blank", "noopener");
    } catch (err) {
      setWa("idle");
      setError(err instanceof Error ? err.message : "Could not start verification.");
    }
  };

  // Poll while waiting. Cleared on unmount and the moment it resolves, so a
  // card that scrolls away does not keep a timer alive.
  useEffect(() => {
    if (wa !== "waiting" || !waToken.current) return;
    let stopped = false;

    const tick = async () => {
      try {
        const res = await fetch(`/api/verify/status?token=${waToken.current}`);
        const json = await res.json();
        if (stopped) return;
        if (json.verified) {
          setWa("done");
          // A beat on the tick so the confirmation is actually seen.
          setTimeout(unlocked, 700);
        } else if (json.expired) {
          setWa("expired");
        }
      } catch {
        /* A dropped poll is not a failure — the next one will catch up. */
      }
    };

    const id = setInterval(tick, 2500);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [wa, unlocked]);

  return (
    <div
      className={`relative overflow-hidden p-6 md:p-8 ${
        bare ? "" : "mt-4 rounded-2xl border border-primary/25 bg-surface-2"
      }`}
    >
      {!bare && (
        <div
          className="ambient-blob pointer-events-none absolute -right-16 -top-20 h-56 w-56 opacity-50"
          aria-hidden="true"
        />
      )}

      <div className="relative mx-auto max-w-xl text-center">
        {/* Three contexts, and the same card has to read right in all of them:
            a search with a rank, one college's page, and the sign-in page
            where nothing is locked yet because nothing has been searched. */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-strong dark:text-primary">
          <Lock className="h-3 w-3" aria-hidden="true" />
          {lockedCount > 0
            ? `${lockedCount.toLocaleString("en-IN")}${alreadyShown ? " more" : ""} ${noun}`
            : "Sign in"}
        </span>

        <h2 className="font-heading mt-3 text-xl font-extrabold text-foreground md:text-2xl">
          {lockedCount > 0 ? (
            <>
              <span className="tnum">{lockedCount.toLocaleString("en-IN")}</span>
              {alreadyShown ? " more " : " "}
              {noun}
              {rank > 0 ? (
                <>
                  {" "}
                  match rank <span className="tnum">{rank.toLocaleString("en-IN")}</span>
                </>
              ) : (
                " published for this college"
              )}
            </>
          ) : (
            "Your number is your account"
          )}
        </h2>
        <p className="mx-auto mt-2 max-w-[48ch] text-[15px] leading-relaxed text-muted-foreground">
          {lockedCount > 0
            ? "Every one with its closing rank, round, quota, fee and how the cut moved."
            : "No password, nothing to remember. Confirm the number once and the full data opens."}
        </p>

        {/* ---- WhatsApp: the recommended path, so it leads ---- */}
        {wa === "waiting" || wa === "done" ? (
          <div className="mt-6 rounded-2xl border border-accent/40 bg-accent-soft p-5 text-left">
            {wa === "done" ? (
              <p className="flex items-center justify-center gap-2 text-[15px] font-bold text-accent">
                <Check className="h-5 w-5" aria-hidden="true" />
                Verified — opening your list
              </p>
            ) : (
              <>
                <p className="flex items-center gap-2 text-[14px] font-bold text-accent">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Waiting for your WhatsApp message
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  Your WhatsApp should have opened with the message ready. Just press send — the list
                  opens here by itself.
                </p>
                <div className="mt-3 rounded-xl border border-border bg-card px-4 py-3 text-center">
                  <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
                    Your code
                  </span>
                  <span className="tnum font-heading text-2xl font-extrabold tracking-[0.2em] text-foreground">
                    {waCode}
                  </span>
                </div>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block text-center text-[13px] font-semibold text-primary hover:underline"
                >
                  WhatsApp didn&apos;t open? Tap here
                </a>
              </>
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={startWhatsApp}
              disabled={wa === "starting"}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {wa === "starting" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              )}
              Verify on WhatsApp — one tap
            </button>
            <p className="mt-2 text-[12px] text-muted-foreground">
              You send us a code. We never message you first.
            </p>

            {wa === "expired" && (
              <p role="alert" className="mt-3 text-[13px] text-signal-stretch">
                That code expired. Tap the button to get a new one.
              </p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[12px] text-muted-foreground">or type your number</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        {/* ---- typed-number fallback ---- */}
        {wa !== "waiting" && wa !== "done" && (
          <form onSubmit={submit} className="mt-5 space-y-3 text-left">
            {/* Off-screen rather than hidden: some bots skip display:none. */}
            <label className="sr-only" aria-hidden="true">
              Leave this empty
              <input
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="unlock-name" className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">
                  Your name
                </label>
                <input
                  id="unlock-name"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[15px] text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="unlock-phone" className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">
                  Mobile number
                </label>
                <input
                  id="unlock-phone"
                  value={phone}
                  inputMode="numeric"
                  autoComplete="tel"
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  aria-describedby={phone && !phoneOk ? "unlock-phone-error" : undefined}
                  className={`tnum w-full rounded-xl border bg-card px-4 py-3 text-[15px] text-foreground outline-none transition-colors ${
                    phone && !phoneOk ? "border-signal-stretch" : "border-border focus:border-primary"
                  }`}
                />
                {phone && !phoneOk && (
                  <p id="unlock-phone-error" className="mt-1.5 text-[12px] text-signal-stretch">
                    Enter a 10-digit Indian mobile number.
                  </p>
                )}
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-signal-stretch/30 bg-signal-stretch/[0.06] px-3 py-2 text-[13px] text-signal-stretch">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!ready || busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Opening
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  {lockedCount > 0
                    ? `Show all ${lockedCount.toLocaleString("en-IN")} ${noun}`
                    : "Sign in"}
                </>
              )}
            </button>
          </form>
        )}

        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          One number, one call — we do not sell it on, and we will not message you repeatedly.
        </p>
      </div>
    </div>
  );
}
