"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  Wallet,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MessageCircle,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { BUDGET_BANDS, TOTAL_BUDGET_BANDS } from "@/lib/counsellingOptions";

/**
 * Signing in, as a real sign-in.
 *
 * ## The shape
 *
 * One number, then whichever second step actually applies:
 *
 *   phone ─┬─ has a password ──▶ password ───────────────▶ in
 *          └─ new, or forgot ──▶ code ──▶ set a password ─▶ in
 *
 * The number comes first and alone because "are you new here?" is a question
 * only we can answer. Asking it produces a screen where half the visitors pick
 * the wrong door and bounce off an error that blames them for it.
 *
 * ## Why a password at all
 *
 * The previous version proved the number over WhatsApp every single time. On a
 * phone that is a tap; on a laptop it means putting the laptop down, finding a
 * number, and sending a message to read a page that is already open. A password
 * is set once, after the proof, and it is skippable — skip it and the code path
 * still works, so nothing is lost by not having one.
 *
 * ## The code
 *
 * Normally we send it and they type it in, which is the flow everybody already
 * knows and which works identically on a laptop, because the code arrives on
 * the phone in their hand. When the gateway cannot send, the screen switches to
 * the original handshake — a code they carry to us in a WhatsApp message — and
 * says why, rather than presenting it as how this always works.
 */

type Step = "phone" | "password" | "code" | "profile" | "setpass" | "done";

/** The send that happened, which decides what the code screen looks like. */
type Channel = "whatsapp" | "inbound";

export interface AuthFlowProps {
  /** Context for the lead record, and for the line above the form. */
  level?: "ug" | "pg";
  rank?: number;
  category?: string;
  /** What is waiting on the other side, for the closing line. */
  noun?: string;
  lockedCount?: number;
  /** Called once they are through. */
  onDone?: () => void;
  /** Inside a dialog the card supplies no border of its own. */
  bare?: boolean;
}

const POLL_MS = 2500;

/**
 * The categories a candidate recognises as their own.
 *
 * Not the 330 codes the counselling authorities publish — most of those are
 * state-local labels for a seat, not something anybody would call themselves.
 * A counsellor needs the reservation the candidate applies under; the exact
 * state code is theirs to work out from it.
 */
const AUTH_CATEGORIES = ["GEN", "OBC", "SC", "ST", "EWS", "GEN-PwD", "NRI"];

export default function AuthFlow({
  level = "pg",
  rank = 0,
  category = "",
  noun = "colleges",
  lockedCount = 0,
  onDone,
  bare = false,
}: AuthFlowProps) {
  const [step, setStep] = useState<Step>("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  /**
   * Rank and category, asked here only when the page does not already know them.
   *
   * The predictor passes both, because they are what the visitor just typed in.
   * A branch or college page passes neither, and those are exactly the enquiries
   * that reached the counsellors with no rank at all — four of the first six.
   * Asking here costs one field on the only screen a new visitor must complete.
   */
  const needsRank = !(rank > 0);
  const needsCategory = !category;
  const [typedRank, setTypedRank] = useState("");
  const [typedCategory, setTypedCategory] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [budgetTotal, setBudgetTotal] = useState("");
  const [branchOptions, setBranchOptions] = useState<string[]>([]);

  /**
   * The branch list, fetched once and only when it is about to be shown.
   *
   * The curated 26 from the CMS rather than the 101 the data holds: a candidate
   * picks from branches they would actually sit for, and a hundred-item list on
   * a phone is a list nobody reads. Names only — no ranks, nothing gated.
   */
  useEffect(() => {
    if (step !== "profile" || level !== "pg" || branchOptions.length) return;
    let cancelled = false;
    fetch("/api/content/pg-branches")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.data) return;
        setBranchOptions(
          (j.data as { branchName?: string }[])
            .map((b) => b.branchName)
            .filter((b): b is string => Boolean(b)),
        );
      })
      .catch(() => {
        // The step still works without them — the field falls back to a text
        // box rather than blocking somebody behind a failed fetch.
      });
    return () => {
      cancelled = true;
    };
  }, [step, level, branchOptions.length]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");

  /** Known only after the lookup. Drives the copy, not just the branch. */
  const [known, setKnown] = useState<{ exists: boolean; firstName: string | null } | null>(null);
  const [resetting, setResetting] = useState(false);

  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [masked, setMasked] = useState("");
  const [waLink, setWaLink] = useState("");
  const [inboundCode, setInboundCode] = useState("");
  const [inboundToken, setInboundToken] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const firstField = useRef<HTMLInputElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  const digits = phone.replace(/\D/g, "").slice(-10);
  const phoneValid = /^[6-9]\d{9}$/.test(digits);

  // Move focus to whatever the new step is asking for. Without this a keyboard
  // or screen-reader user is left on the button they just pressed while the
  // question silently changes underneath them.
  useEffect(() => {
    if (step === "done") return;
    const t = setTimeout(() => firstField.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const post = useCallback(async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
    return json as Record<string, unknown>;
  }, []);

  /** Asks for a code and sets up whichever screen the answer calls for. */
  const requestCode = useCallback(
    async (purpose: "signup" | "reset") => {
      const json = await post("/api/auth/otp", {
        phone: digits,
        name: name.trim() || undefined,
        purpose,
        level,
        // What the page knew, or what they just told us. Either way the code
        // carries it, so it lands on the enquiry when the code is redeemed.
        rank: rank || Number(typedRank) || undefined,
        category: category || typedCategory || undefined,
        sourcePage: typeof window !== "undefined" ? window.location.pathname : undefined,
        honeypot: honeypot.current?.value || undefined,
      });

      setChannel(json.channel === "inbound" ? "inbound" : "whatsapp");
      setMasked(String(json.masked ?? ""));
      setWaLink(String(json.waLink ?? ""));
      setInboundCode(String(json.code ?? ""));
      setInboundToken(String(json.token ?? ""));
      setNotice(json.note ? String(json.note) : null);
      setCode("");
      setCooldown(30);
      setStep("code");
    },
    [post, digits, name, level, rank, category, typedRank, typedCategory],
  );

  /* ------------------------------------------------ inbound fallback poll */

  useEffect(() => {
    if (step !== "code" || channel !== "inbound" || !inboundToken) return;
    let live = true;

    const tick = async () => {
      try {
        const res = await fetch(`/api/verify/status?token=${encodeURIComponent(inboundToken)}`);
        const json = await res.json();
        if (!live) return;
        if (json.verified) {
          setStep(json.hasPassword ? "done" : "setpass");
          return;
        }
        if (json.expired) {
          setError("That code expired. Ask for a new one.");
          return;
        }
        setTimeout(tick, POLL_MS);
      } catch {
        if (live) setTimeout(tick, POLL_MS * 2);
      }
    };

    const t = setTimeout(tick, POLL_MS);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [step, channel, inboundToken]);

  useEffect(() => {
    if (step === "done") onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---------------------------------------------------------- submissions */

  const submitPhone = async () => {
    if (!phoneValid) return setError("Enter a 10-digit Indian mobile number.");
    // Required for somebody we have not met. Four of the first six enquiries
    // reached the counsellors as "Not given", so every call opened by asking a
    // stranger their name — one field here is cheaper than that, every time.
    if (!known?.exists && name.trim().length < 2) {
      return setError("Please tell us your name.");
    }
    setBusy(true);
    setError(null);
    try {
      const found = await post("/api/auth/lookup", { phone: digits });
      setKnown({ exists: Boolean(found.exists), firstName: (found.firstName as string) ?? null });
      if (found.hasPassword) {
        setStep("password");
      } else {
        await requestCode("signup");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async () => {
    if (!password) return setError("Enter your password.");
    setBusy(true);
    setError(null);
    try {
      await post("/api/auth/login", { phone: digits, password });
      // A returning visitor has answered these already; `profileNeeded` checks
      // rather than assumes, because the account may predate the questions.
      setStep("profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign you in.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (code.replace(/\D/g, "").length !== 6) return setError("Enter the six digits we sent you.");
    setBusy(true);
    setError(null);
    try {
      const json = await post("/api/auth/verify", {
        phone: digits,
        code,
        name: name.trim() || undefined,
        purpose: resetting ? "reset" : "signup",
        level,
        rank: rank || undefined,
        category: category || undefined,
      });
      // A reset is somebody who already has an account and a profile, so it
      // goes straight on. A first sign-up answers the questions a counsellor
      // would otherwise have to ring up and ask.
      setStep(resetting ? "setpass" : "profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code is not right.");
    } finally {
      setBusy(false);
    }
  };

  /**
   * The questions a counsellor cannot work without.
   *
   * Mandatory, and checked here as well as on the server — the browser check is
   * so somebody is told what is wrong while looking at it, the server check is
   * what decides what is stored, because a POST need not come from this form.
   *
   * It runs *after* the number is verified on purpose. Seven fields on the first
   * screen loses people who would have answered all seven once they were in, and
   * an abandoned form leaves nothing at all — this way the number and the name
   * are already recorded whatever happens next.
   */
  const submitProfile = async () => {
    if (needsRank && !(Number(typedRank) > 0 && Number(typedRank) <= 2_000_000)) {
      return setError("Enter your NEET rank — digits only.");
    }
    if (needsCategory && !typedCategory) {
      return setError("Choose the category you apply under.");
    }
    if (level === "pg" && branches.length === 0) {
      return setError("Pick at least one branch you are aiming for.");
    }
    if (!budget) return setError("Choose what you can pay each year.");
    if (!budgetTotal) return setError("Choose what you can raise in total.");

    setBusy(true);
    setError(null);
    try {
      await post("/api/profile", {
        rank: rank || typedRank || undefined,
        category: category || typedCategory || undefined,
        preferredBranches: branches.length ? branches : undefined,
        budget,
        budgetTotal,
        notify: true,
        source: typeof window !== "undefined" ? window.location.pathname : "Sign-in",
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  };

  const toggleBranch = (b: string) =>
    setBranches((cur) =>
      cur.includes(b) ? cur.filter((x) => x !== b) : cur.length >= 5 ? cur : [...cur, b],
    );

  const submitNewPassword = async () => {
    if (password.length < 8) return setError("Use at least 8 characters.");
    setBusy(true);
    setError(null);
    try {
      await post("/api/auth/password", { password });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that password.");
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setBusy(true);
    setError(null);
    setResetting(true);
    try {
      await requestCode("reset");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send a code.");
      setResetting(false);
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    setError(null);
    setNotice(null);
    setPassword("");
    setResetting(false);
    setStep("phone");
  };

  /* ------------------------------------------------------------------ UI */

  const wrap = bare
    ? "px-5 py-7 sm:px-8 sm:py-9"
    : "rounded-2xl border border-border bg-card p-6 shadow-lift md:p-8";

  return (
    <div className={wrap}>
      {/* A three-dot rail, so the visitor can see this is short and where they
          are in it. Two steps look endless when you cannot see the end. */}
      {step !== "done" && (
        <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
          {(
            ["phone", step === "password" ? "password" : "code", "profile", "setpass"] as const
          ).map((s, i) => {
            const order: Step[] = [
              "phone",
              step === "password" ? "password" : "code",
              "profile",
              "setpass",
            ];
            const at = order.indexOf(step);
            const state = i < at ? "done" : i === at ? "now" : "todo";
            return (
              <li key={s} className="flex flex-1 items-center gap-2">
                <span
                  aria-current={state === "now" ? "step" : undefined}
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    state === "done"
                      ? "bg-accent text-white"
                      : state === "now"
                        ? "bg-gradient-brand text-white"
                        : "border border-border bg-surface-2 text-muted-foreground"
                  }`}
                >
                  {state === "done" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                </span>
                {i < 2 && <span className="h-px flex-grow bg-border" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      )}

      {/* ------------------------------ step 1 ------------------------------ */}
      {step === "phone" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitPhone();
          }}
        >
          <h2 id="auth-flow-title" className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
            Sign in to continue
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {lockedCount > 0 ? (
              <>
                Your <span className="tnum font-semibold text-foreground">{lockedCount}</span>{" "}
                {noun} are ready. New here or coming back, it starts with your number.
              </>
            ) : (
              <>New here or coming back, it starts with your number.</>
            )}
          </p>

          <Field label="Mobile number" htmlFor="auth-phone" icon={Phone}>
            <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-[16px] font-semibold text-muted-foreground">
              +91
            </span>
            <input
              id="auth-phone"
              ref={firstField}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
              className="h-14 w-full rounded-xl border-2 border-border bg-background pl-[4.75rem] pr-4 text-[16px] font-semibold text-foreground outline-none transition-colors focus:border-primary"
            />
          </Field>

          {/* Only asked of somebody we have never met, and never asked twice. */}
          <Field label="Your name" htmlFor="auth-name" icon={User}>
            <input
              id="auth-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="So a counsellor knows who they are speaking to"
              className="h-14 w-full rounded-xl border-2 border-border bg-background pl-11 pr-4 text-[16px] text-foreground outline-none transition-colors focus:border-primary"
            />
          </Field>

          {/*
            Only when the page has not already told us. On the predictor these
            were typed into the tool itself, and asking twice is how a useful
            step starts to feel like a form.
          */}
          {(needsRank || needsCategory) && (
            <div className={needsRank && needsCategory ? "grid gap-3 sm:grid-cols-2" : ""}>
              {needsRank && (
                <Field label="Your NEET rank" htmlFor="auth-rank" icon={Award}>
                  <input
                    id="auth-rank"
                    type="text"
                    inputMode="numeric"
                    value={typedRank}
                    onChange={(e) => setTypedRank(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="e.g. 38951"
                    className="tnum h-14 w-full rounded-xl border-2 border-border bg-background pl-11 pr-4 text-[16px] text-foreground outline-none transition-colors focus:border-primary"
                  />
                </Field>
              )}

              {needsCategory && (
                <Field label="Your category" htmlFor="auth-category" icon={ShieldCheck}>
                  <select
                    id="auth-category"
                    value={typedCategory}
                    onChange={(e) => setTypedCategory(e.target.value)}
                    className="h-14 w-full appearance-none rounded-xl border-2 border-border bg-background pl-11 pr-4 text-[16px] text-foreground outline-none transition-colors focus:border-primary"
                  >
                    <option value="">Select</option>
                    {AUTH_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          )}

          {/* Bots fill everything; people never see this. */}
          <input
            ref={honeypot}
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
          />

          <FormError message={error} />
          <Submit busy={busy} disabled={!phoneValid}>
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Submit>

          <p className="mt-4 text-center text-[12.5px] leading-relaxed text-muted-foreground">
            Your number is how we reach you about counselling, and nothing else. It is never sold or
            passed on.
          </p>
        </form>
      )}

      {/* ------------------------------ step 2a ----------------------------- */}
      {step === "password" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitPassword();
          }}
        >
          <Back onClick={back} />
          <h2 className="font-heading mt-3 text-2xl font-extrabold tracking-tight text-foreground">
            {known?.firstName ? `Welcome back, ${known.firstName}.` : "Welcome back."}
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Enter the password you set for <span className="font-semibold text-foreground">+91 {digits}</span>.
          </p>

          <Field label="Password" htmlFor="auth-password" icon={KeyRound}>
            <input
              id="auth-password"
              ref={firstField}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 w-full rounded-xl border-2 border-border bg-background pl-11 pr-14 text-[16px] text-foreground outline-none transition-colors focus:border-primary"
            />
            <Reveal shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </Field>

          <FormError message={error} />
          <Submit busy={busy} disabled={!password}>
            Sign in
          </Submit>

          <button
            type="button"
            onClick={forgot}
            disabled={busy}
            className="mx-auto mt-4 block text-[14px] font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            Forgot your password? Get a code instead
          </button>
        </form>
      )}

      {/* ------------------------------ step 2b ----------------------------- */}
      {step === "code" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (channel === "whatsapp") submitCode();
          }}
        >
          <Back onClick={back} />

          {channel === "whatsapp" ? (
            <>
              <h2 className="font-heading mt-3 text-2xl font-extrabold tracking-tight text-foreground">
                Enter the code we sent
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                Six digits, on WhatsApp to{" "}
                <span className="font-semibold text-foreground">{masked || `+91 ${digits}`}</span>. It
                works for the next 10 minutes.
              </p>

              <label htmlFor="auth-code" className="mt-6 block text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Verification code
              </label>
              <input
                id="auth-code"
                ref={firstField}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="tnum font-heading mt-2 h-16 w-full rounded-xl border-2 border-border bg-background px-4 text-center text-3xl font-extrabold tracking-[0.5em] text-foreground outline-none transition-colors focus:border-primary"
              />

              <FormError message={error} />
              <Submit busy={busy} disabled={code.replace(/\D/g, "").length !== 6}>
                Verify and continue
              </Submit>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13.5px]">
                <button
                  type="button"
                  disabled={cooldown > 0 || busy}
                  onClick={() => requestCode(resetting ? "reset" : "signup")}
                  className="font-semibold text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Send it again"}
                </button>
                <span className="text-muted-foreground" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={back}
                  className="font-semibold text-muted-foreground underline-offset-4 hover:underline"
                >
                  Wrong number?
                </button>
              </div>
            </>
          ) : (
            /* The gateway could not send, so the visitor sends instead. Said as
               the exception it is, rather than as how this normally works. */
            <>
              <h2 className="font-heading mt-3 text-2xl font-extrabold tracking-tight text-foreground">
                One tap on WhatsApp
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                {notice ? `${notice} ` : ""}Send us this code from{" "}
                <span className="font-semibold text-foreground">+91 {digits}</span> and you are in —
                the message is already written, you only have to hit send.
              </p>

              <div className="mt-5 rounded-xl border border-border bg-surface-2 p-4 text-center">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Your code
                </span>
                <div className="font-heading mt-1 text-3xl font-extrabold tracking-[0.3em] text-foreground">
                  {inboundCode}
                </div>
              </div>

              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex h-14 items-center justify-center gap-2.5 rounded-xl bg-accent px-6 text-[15px] font-bold text-white transition-transform hover:-translate-y-0.5"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Open WhatsApp and send it
              </a>

              <p className="mt-4 flex items-center justify-center gap-2 text-[13.5px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Waiting for your message…
              </p>
              <FormError message={error} />
            </>
          )}
        </form>
      )}

      {/* --------------------- step 3: who we are advising ------------------- */}
      {step === "profile" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitProfile();
          }}
        >
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Last step. A counsellor reads these before they call, so nobody has to take you back
            through them on the phone.
          </p>

          <div className="mt-5 space-y-4">
            {needsRank && (
              <Field label="Your NEET rank" htmlFor="p-rank" icon={Award}>
                <input
                  id="p-rank"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={typedRank}
                  onChange={(e) => setTypedRank(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 38951"
                  className="tnum h-14 w-full rounded-xl border-2 border-border bg-background pl-11 pr-4 text-[16px] text-foreground outline-none transition-colors focus:border-primary"
                />
              </Field>
            )}

            {needsCategory && (
              <Field label="Your category" htmlFor="p-category" icon={ShieldCheck}>
                <select
                  id="p-category"
                  value={typedCategory}
                  onChange={(e) => setTypedCategory(e.target.value)}
                  className="h-14 w-full appearance-none rounded-xl border-2 border-border bg-background pl-11 pr-4 text-[16px] text-foreground outline-none transition-colors focus:border-primary"
                >
                  <option value="">Select</option>
                  {AUTH_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* Several, because nobody aims at one branch — and a counsellor
                told only the first builds the wrong shortlist. */}
            {level === "pg" && (
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  Branches you are aiming for
                  <span className="ml-1.5 font-normal text-muted-foreground">pick up to 5</span>
                </p>
                {branchOptions.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {branchOptions.map((b) => {
                      const chosen = branches.includes(b);
                      return (
                        <button
                          key={b}
                          type="button"
                          aria-pressed={chosen}
                          onClick={() => toggleBranch(b)}
                          disabled={!chosen && branches.length >= 5}
                          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-40 ${
                            chosen
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-card text-foreground hover:border-primary/50"
                          }`}
                        >
                          {chosen && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                          {b}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // The list did not load — a text box beats a dead end.
                  <input
                    type="text"
                    value={branches.join(", ")}
                    onChange={(e) =>
                      setBranches(
                        e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean)
                          .slice(0, 5),
                      )
                    }
                    placeholder="Radiology, Dermatology"
                    className="mt-2 h-14 w-full rounded-xl border-2 border-border bg-background px-4 text-[16px] text-foreground outline-none focus:border-primary"
                  />
                )}
              </div>
            )}

            <Field label="What you can pay each year" htmlFor="p-budget" icon={Wallet}>
              <select
                id="p-budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="h-14 w-full appearance-none rounded-xl border-2 border-border bg-background pl-11 pr-4 text-[16px] text-foreground outline-none transition-colors focus:border-primary"
              >
                <option value="">Select</option>
                {BUDGET_BANDS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="What you can raise in total, across the whole course"
              htmlFor="p-budget-total"
              icon={Wallet}
            >
              <select
                id="p-budget-total"
                value={budgetTotal}
                onChange={(e) => setBudgetTotal(e.target.value)}
                className="h-14 w-full appearance-none rounded-xl border-2 border-border bg-background pl-11 pr-4 text-[16px] text-foreground outline-none transition-colors focus:border-primary"
              >
                <option value="">Select</option>
                {TOTAL_BUDGET_BANDS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                Fees, deposit, hostel and the years after this one — not three times the yearly
                figure.
              </p>
            </Field>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            )}
            Show me my colleges
          </button>
          <FormError message={error} />
        </form>
      )}

      {/* ------------------------------ step 4 ------------------------------ */}
      {step === "setpass" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitNewPassword();
          }}
        >
          <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-accent">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Number verified
          </div>
          <h2 className="font-heading mt-3 text-2xl font-extrabold tracking-tight text-foreground">
            {resetting ? "Set a new password" : "Set a password for next time"}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {resetting
              ? "Pick something you will remember. You will sign in with your number and this password."
              : "You are in. Set a password and next time it is just your number and this — no code, no phone needed."}
          </p>

          <Field label="New password" htmlFor="auth-new-password" icon={KeyRound}>
            <input
              id="auth-new-password"
              ref={firstField}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-14 w-full rounded-xl border-2 border-border bg-background pl-11 pr-14 text-[16px] text-foreground outline-none transition-colors focus:border-primary"
            />
            <Reveal shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </Field>

          <FormError message={error} />
          <Submit busy={busy} disabled={password.length < 8}>
            Save and continue
          </Submit>

          {/* Skippable on purpose. Forcing a password on somebody in the middle
              of counselling is how you lose them at the checkout. */}
          {!resetting && (
            <button
              type="button"
              onClick={() => setStep("done")}
              className="mx-auto mt-4 block text-[14px] font-semibold text-muted-foreground underline-offset-4 hover:underline"
            >
              Skip for now — use a code each time
            </button>
          )}
        </form>
      )}

      {step === "done" && (
        <div className="py-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
            <Check className="h-6 w-6 text-accent" aria-hidden="true" />
          </span>
          <h2 className="font-heading mt-4 text-xl font-extrabold text-foreground">You are in</h2>
          <p className="mt-1.5 text-[15px] text-muted-foreground">Loading your {noun}…</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ bits */

function Field({
  label,
  htmlFor,
  icon: Icon,
  optional = false,
  children,
}: {
  label: string;
  htmlFor: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      {/* A visible label, not a placeholder. A placeholder disappears the moment
          you type, which is exactly when you need to know what the field was. */}
      <label htmlFor={htmlFor} className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
        {optional && <span className="ml-1.5 font-semibold normal-case tracking-normal opacity-70">optional</span>}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

function Reveal({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  const Icon = shown ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
    </button>
  );
}

function Submit({
  busy,
  disabled,
  children,
}: {
  busy: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="mt-6 flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-brand text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-none"
    >
      {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Change number
    </button>
  );
}

/**
 * The error, next to the field it is about and announced when it appears.
 *
 * `role="alert"` rather than a silent colour change: a validation message a
 * screen reader never reads is a form that fails without saying why.
 */
function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-4 rounded-xl border border-signal-stretch/30 bg-signal-stretch/[0.07] px-4 py-3 text-[14px] leading-relaxed text-signal-stretch">
      {message}
    </p>
  );
}
