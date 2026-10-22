"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, BellRing, CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { TelegramIcon } from "@/components/icons/TelegramIcon";
import { fillRound, useTelegram } from "@/components/engage/TelegramLink";
import { CONTACT_INFO } from "@/lib/constants";
import { checkRank } from "@/lib/neetLimits";
import { checkName } from "@/lib/formRules";
import { checkPhone } from "@/lib/phone";
import { trackEvent, trackLead } from "@/lib/analytics";
import { TeamFigure } from "@/components/engage/TeamFigures";

/**
 * The site reaching out (2026-10-12) — four nudges, each a step toward a
 * counsellor, never more than one big one on screen at a time:
 *
 *   1. WhatsApp greeting   8 s   "Counsellors are online" (or when they are back)
 *   2. Alert toast        15 s   the newest counselling notice + "what does it mean for me?"
 *   3. Rank nudge         25 s   rank in, straight to the possibility report
 *   4. Exit offer          leaving (desktop) / 60 s and half the page read (phone)
 *
 * Every one remembers being dismissed (localStorage, per viewer — a nudge that
 * comes back on every page is how a site gets closed), and none run on the
 * sign-in, account or admin pages. Signed-in visitors are not asked for a
 * number they have already given.
 *
 * The rule since 2026-10-17 (GA4, 19 Sep–16 Oct: 2,047 shown, 1,278 dismissed,
 * 39 clicked):
 *   - never on the first page of a visit — only from the second page view;
 *   - at most one nudge per visit (sessionStorage), the most useful one that
 *     applies: finish-your-profile, then the rank nudge, then a new counselling
 *     notice, then the Telegram invite, then the WhatsApp greeting; the exit
 *     offer only if none has shown;
 *   - seven days of quiet after any nudge is dismissed or used.
 * The desktop WhatsApp button is not a nudge and stays.
 *
 * The Telegram invite (2026-10-17) shows a visitor once a month at most, and
 * never again for 30 days after they follow any link to the channel
 * (ClickTracker calls rememberNudge). The notice toast carries the channel too.
 *
 * One exception to "never on the first page" (owner, 2026-10-22): on a data page
 * (DATA_PAGES — cutoffs, stipend, round results, seat matrix, bond, PG branches
 * and states) the Telegram invite may show on the first page, to a reader who has
 * stayed 18 s and scrolled past the first screen. Search visitors mostly read one
 * page, so the second-page rule meant almost none of them ever saw it. The other
 * rules hold: one nudge a visit, a week of quiet, once a month. While a NEET PG
 * round's result is next it invites to that result's alert (TelegramLink `round`).
 */

type Big = "resume" | "toast" | "rank" | "exit" | "telegram" | null;

interface Alert {
  id: number;
  title: string;
  link: string | null;
}

const KEY = "ah_nudges_v1";
const DAY = 86_400_000;
const QUIET_PATHS = /^\/(login|account|admin)/;
/** Pages read for figures that move round by round — the Telegram invite may show on the first page here. */
const DATA_PAGES = /^\/(neet-(pg|ug|ss|mds)-cutoff|neet-(ss|mds)\/|neet-pg-counselling|neet-pg-seat-matrix|md-ms-india\/(stipend|bond|branches|states)|reports\/)/;

function memory(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
/** Records that a nudge was seen or acted on — for callers outside this file, too. */
export function rememberNudge(name: string) {
  remember(name);
}
function remember(name: string) {
  try {
    const m = memory();
    m[name] = Date.now();
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* private mode: the nudge just shows again next time */
  }
}
const seenWithin = (name: string, ms: number) => {
  const at = memory()[name];
  return typeof at === "number" && Date.now() - at < ms;
};

/** Seven days of quiet after any nudge is dismissed or used. */
const QUIET_MS = 7 * DAY;
const silence = (name: string) => {
  remember(name);
  remember("quiet");
};

/** This visit: page views so far, and whether a nudge has already been shown. */
const SESSION = "ah_visit_v1";
function visit(): { pv: number; nudged: boolean } {
  try {
    return { pv: 0, nudged: false, ...JSON.parse(sessionStorage.getItem(SESSION) || "{}") };
  } catch {
    // No session storage: no way to keep the count, so stay quiet.
    return { pv: 0, nudged: true };
  }
}
function saveVisit(v: { pv: number; nudged: boolean }) {
  try {
    sessionStorage.setItem(SESSION, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}
/** Claims this visit's one nudge; false if it is already taken. */
function claimVisit(): boolean {
  const v = visit();
  if (v.nudged) return false;
  saveVisit({ ...v, nudged: true });
  return true;
}

/** Counsellors answer 10 AM – 10 PM IST, every day. */
function openNow(): boolean {
  const ist = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60_000);
  const h = ist.getHours();
  return h >= 10 && h < 22;
}

const waNumber = CONTACT_INFO.whatsapp.replace(/\D/g, "");
const wa = (text: string) => `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;

export default function EngagementLayer({
  signedIn,
  alerts,
  firstName = null,
  resumeProfile = false,
}: {
  signedIn: boolean;
  alerts: Alert[];
  firstName?: string | null;
  /** Signed in, but stopped before the questions that decide their list. */
  resumeProfile?: boolean;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const quiet = QUIET_PATHS.test(pathname);
  const onPredictor = pathname.startsWith("/neet-college-predictor");

  const [bubble, setBubble] = useState(false);
  const [big, setBig] = useState<Big>(null);
  const bigRef = useRef<Big>(null);
  const [online, setOnline] = useState(true);
  const telegram = useTelegram();

  // One nudge a visit: whichever claims the visit first is the only one.
  const show = useCallback((b: Exclude<Big, null>) => {
    if (bigRef.current || !claimVisit()) return false;
    bigRef.current = b;
    setBig(b);
    trackEvent("nudge_shown", { type: b });
    return true;
  }, []);
  const showBubble = useCallback(() => {
    if (bigRef.current || !claimVisit()) return;
    setBubble(true);
    trackEvent("nudge_shown", { type: "bubble" });
  }, []);
  // Closed or used — either way, a week of quiet.
  const close = useCallback((b: Exclude<Big, null>, rememberAs: string) => {
    silence(rememberAs);
    bigRef.current = null;
    setBig(null);
    trackEvent("nudge_dismissed", { type: b });
  }, []);
  const counted = useRef<string | null>(null);

  const newest = alerts[0] ?? null;

  useEffect(() => {
    if (quiet) return;
    setOnline(openNow());

    // Count this page view once, then decide whether this visit may be nudged.
    let v = visit();
    if (counted.current !== pathname) {
      counted.current = pathname;
      v = { ...v, pv: v.pv + 1 };
      saveVisit(v);
    }
    if (v.nudged || seenWithin("quiet", QUIET_MS)) return;
    if (v.pv < 2) {
      // The first page of a visit stays quiet — but on a data page a reader who has stayed and
      // scrolled past the first screen is offered the Telegram channel.
      if (!DATA_PAGES.test(pathname) || seenWithin("telegram", 30 * DAY)) return;
      let ready = false;
      const offer = () => {
        if (!ready || window.scrollY < window.innerHeight * 0.6) return;
        window.removeEventListener("scroll", offer);
        show("telegram");
      };
      const timer = window.setTimeout(() => {
        ready = true;
        offer();
      }, 18_000);
      window.addEventListener("scroll", offer, { passive: true });
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("scroll", offer);
      };
    }
    const timers: number[] = [];

    // The one nudge this page may show, the most useful first. A student who
    // stopped halfway through their profile comes before everything.
    if (resumeProfile && !onPredictor && !seenWithin("resume", QUIET_MS)) {
      timers.push(window.setTimeout(() => show("resume"), 3_000));
    } else if (!signedIn && !onPredictor && !seenWithin("rank", QUIET_MS)) {
      timers.push(window.setTimeout(() => show("rank"), 20_000));
    } else if (newest && !seenWithin(`alert-${newest.id}`, 30 * DAY)) {
      timers.push(window.setTimeout(() => show("toast"), 12_000));
    } else if (!seenWithin("telegram", 30 * DAY)) {
      timers.push(window.setTimeout(() => show("telegram"), 10_000));
    } else if (!seenWithin("bubble", QUIET_MS)) {
      timers.push(window.setTimeout(() => showBubble(), 10_000));
    }

    // Leaving: the pointer heading for the tab bar on a desktop; on a phone,
    // a minute in and half the page read — the moment a visitor is weighing it.
    // Only while this visit has had no nudge (show() checks).
    let armed = false;
    timers.push(window.setTimeout(() => (armed = true), 12_000));
    const canExit = () => armed && !signedIn && !seenWithin("exit", QUIET_MS);
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0 && canExit()) show("exit");
    };
    const started = Date.now();
    const onScroll = () => {
      if (window.innerWidth >= 768 || !canExit()) return;
      const read = (window.scrollY + window.innerHeight) / Math.max(1, document.documentElement.scrollHeight);
      if (Date.now() - started > 60_000 && read > 0.5) show("exit");
    };
    document.addEventListener("mouseout", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      document.removeEventListener("mouseout", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname, quiet, signedIn, onPredictor, newest, show, showBubble, resumeProfile]);

  if (quiet) return null;

  return (
    <>
      {/* ---------------- 1. WhatsApp: a button on desktop, and the greeting ---------------- */}
      <a
        href={wa("Hello AdmissionHands counsellor, I need help with NEET counselling.")}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("nudge_click", { type: "whatsapp_button" })}
        className="fixed bottom-6 right-6 z-[90] hidden h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.45)] transition-transform hover:scale-105 md:flex"
        aria-label="WhatsApp a counsellor"
      >
        <WhatsAppIcon size={28} />
      </a>
      {bubble && (
        <div
          role="status"
          className="animate-rise fixed bottom-[4.5rem] right-4 z-[91] w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 pr-9 shadow-lift md:bottom-[5.75rem] md:right-6"
        >
          <button
            type="button"
            onClick={() => {
              silence("bubble");
              setBubble(false);
            }}
            className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-accent">
            <span className={`h-2 w-2 rounded-full ${online ? "bg-accent" : "bg-muted-foreground"}`} aria-hidden="true" />
            {online ? "Counsellors online now" : "Back at 10 AM"}
          </p>
          <p className="mt-1.5 text-[14px] leading-snug text-foreground">
            {online
              ? "Namaste! Stuck on a rank, a round or a quota? Ask a counsellor on WhatsApp."
              : "Leave your question on WhatsApp — a counsellor replies first thing from 10 AM."}
          </p>
          <a
            href={wa("Hello AdmissionHands counsellor, I need help with NEET counselling.")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackEvent("nudge_click", { type: "whatsapp_bubble" });
              silence("bubble");
              setBubble(false);
            }}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-[13.5px] font-bold text-white hover:bg-[#1fbf5b]"
          >
            <WhatsAppIcon className="h-4 w-4" /> Chat with a counsellor
          </a>
        </div>
      )}

      {/* ---------------- 2. The newest counselling notice ---------------- */}
      {big === "toast" && newest && (
        <div
          role="dialog"
          aria-label="Counselling update"
          className="animate-rise fixed right-4 top-[124px] z-[92] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-primary/30 bg-card p-4 pr-9 shadow-lift md:right-6"
        >
          <button
            type="button"
            onClick={() => close("toast", `alert-${newest.id}`)}
            className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-primary">
            <BellRing className="h-3.5 w-3.5" aria-hidden="true" /> Counselling update
          </p>
          <p className="mt-1.5 text-[14px] font-semibold leading-snug text-foreground">{newest.title}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={wa(`Hello AdmissionHands counsellor, what does this mean for me: "${newest.title}"?`)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackEvent("nudge_click", { type: "alert_whatsapp" });
                close("toast", `alert-${newest.id}`);
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 text-[13px] font-bold text-white"
            >
              <WhatsAppIcon className="h-4 w-4" /> What does it mean for me?
            </a>
            {newest.link && (
              <a
                href={newest.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => close("toast", `alert-${newest.id}`)}
                className="inline-flex min-h-10 items-center rounded-xl border border-border px-3.5 text-[13px] font-semibold text-foreground hover:border-primary/40"
              >
                Read the notice
              </a>
            )}
            <a
              href={telegram.url}
              target="_blank"
              rel="noopener noreferrer"
              data-placement="alert_toast"
              onClick={() => {
                trackEvent("nudge_click", { type: "alert_telegram" });
                close("toast", `alert-${newest.id}`);
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3.5 text-[13px] font-semibold text-foreground hover:border-primary/40"
            >
              <TelegramIcon className="h-4 w-4 text-[#229ED9]" /> Updates on Telegram
            </a>
          </div>
        </div>
      )}

      {/* ---------------- 2b. The Telegram channel ---------------- */}
      {big === "telegram" && (
        <div
          role="dialog"
          aria-label={telegram.round ? "Result alert on Telegram" : "Counselling updates on Telegram"}
          className="animate-rise fixed bottom-[4.5rem] right-4 z-[91] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-primary/30 bg-card p-4 pr-9 shadow-lift md:bottom-[5.75rem] md:right-6"
        >
          <button
            type="button"
            onClick={() => close("telegram", "telegram")}
            className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-primary-strong">
            <TelegramIcon className="h-3.5 w-3.5 text-[#229ED9]" />{" "}
            {telegram.round ? fillRound(telegram.roundCopy.eyebrow, telegram.round) : "Free counselling updates"}
          </p>
          <p className="mt-1.5 text-[14px] leading-snug text-foreground">
            {telegram.round ? fillRound(telegram.roundCopy.nudge, telegram.round) : telegram.nudge}
          </p>
          <a
            href={telegram.url}
            target="_blank"
            rel="noopener noreferrer"
            data-placement={telegram.round ? "nudge_round" : "nudge"}
            onClick={() => {
              trackEvent("nudge_click", { type: "telegram" });
              close("telegram", "telegram");
            }}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary-strong px-4 text-[13.5px] font-bold text-white hover:bg-primary-strong/90 dark:bg-primary dark:text-primary-foreground"
          >
            <TelegramIcon className="h-4 w-4" /> Join on Telegram
          </a>
        </div>
      )}

      {/* ---------------- 3. Rank in, report out ---------------- */}
      {big === "rank" && (
        <RankNudge
          onClose={() => close("rank", "rank")}
          onGo={(course, rank) => {
            trackEvent("nudge_click", { type: "rank" });
            close("rank", "rank");
            router.push(`/neet-college-predictor?course=${course}&rank=${rank}`);
          }}
        />
      )}

      {/* ---------------- 0. Finish what you started ---------------- */}
      {big === "resume" && (
        <ResumeOffer
          firstName={firstName}
          onClose={() => close("resume", "resume")}
          onGo={() => {
            trackEvent("nudge_click", { type: "resume" });
            close("resume", "resume");
            router.push("/neet-college-predictor");
          }}
        />
      )}

      {/* ---------------- 4. Before you go ---------------- */}
      {big === "exit" && <ExitOffer onClose={() => close("exit", "exit")} source={pathname} />}
    </>
  );
}

function RankNudge({ onClose, onGo }: { onClose: () => void; onGo: (course: string, rank: number) => void }) {
  const [course, setCourse] = useState<"mbbs" | "bds" | "pg">("mbbs");
  const [rank, setRank] = useState("");
  const checked = checkRank(rank, course === "pg" ? "pg" : "ug");
  return (
    <div
      role="dialog"
      aria-label="Check your NEET rank"
      className="animate-rise fixed bottom-[4.25rem] left-3 right-3 z-[92] rounded-2xl border border-primary/30 bg-card p-5 shadow-glow-lg md:bottom-6 md:left-6 md:right-auto md:w-[23rem]"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-primary">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Free · 10 seconds
      </p>
      <p className="font-heading mt-1.5 text-[17px] font-extrabold leading-snug text-foreground">
        Where can your NEET rank take you?
      </p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (checked.ok) onGo(course, checked.value);
        }}
      >
        <select
          value={course}
          onChange={(e) => setCourse(e.target.value as "mbbs" | "bds" | "pg")}
          className="h-11 rounded-xl border border-border bg-background px-2 text-[14px] text-foreground"
          aria-label="Course"
        >
          <option value="mbbs">MBBS</option>
          <option value="bds">BDS</option>
          <option value="pg">MD/MS</option>
        </select>
        <input
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          inputMode="numeric"
          placeholder="Your rank"
          aria-label="Your NEET all-India rank"
          className="tnum h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-[15px] font-bold text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!checked.ok}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow disabled:opacity-40"
          aria-label="Show my possibilities"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
      {rank && !checked.ok && <p className="mt-1.5 text-[12px] text-signal-stretch">{checked.error}</p>}
    </div>
  );
}

function ExitOffer({ onClose, source }: { onClose: () => void; source: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [course, setCourse] = useState<"ug" | "pg">("ug");
  const [rank, setRank] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = checkName(name);
    if (!n.ok) return setError(n.error);
    const p = checkPhone(phone);
    if (!p.ok) return setError(p.error);
    const r = rank ? checkRank(rank, course) : null;
    if (r && !r.ok) return setError(r.error);
    setError(null);
    setState("saving");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: n.value,
          phone: p.e164,
          level: course,
          rank: r && r.ok ? r.value : undefined,
          message: "Asked for a counselling roadmap from the exit offer.",
          source: `Exit offer (${source})`,
          honeypot,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("idle");
        return setError(json.error || "Could not send. Try WhatsApp instead.");
      }
      trackEvent("nudge_click", { type: "exit_submit" });
      trackLead({ form: "exit_offer", course, rank });
      setState("done");
    } catch {
      setState("idle");
      setError("Could not send. Check your connection, or message us on WhatsApp.");
    }
  };

  const field =
    "h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-h"
        onClick={(e) => e.stopPropagation()}
        className="animate-rise relative w-full max-w-lg overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-glow-lg"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="bg-gradient-brand px-6 py-5 text-white">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/80">Before you go</p>
          <h2 id="exit-h" className="font-heading mt-1 text-[1.45rem] font-extrabold leading-tight">
            Get your NEET counselling roadmap — free
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/85">
            A counsellor calls you with a plan: which colleges to fill, in what order, and when to float for an upgrade.
          </p>
        </div>
        {state === "done" ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-accent" aria-hidden="true" />
            <p className="font-heading mt-2 text-lg font-extrabold text-foreground">A counsellor will call you</p>
            <p className="mt-1 text-[14px] text-muted-foreground">Open daily 10 AM – 10 PM. Can&apos;t wait? Message us now.</p>
            <a
              href={wa("Hello AdmissionHands counsellor, I just asked for a counselling roadmap.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-[15px] font-bold text-white"
            >
              <WhatsAppIcon className="h-5 w-5" /> WhatsApp a counsellor
            </a>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-3 p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Student or parent's name" className={field} aria-label="Name" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" className={`tnum ${field}`} aria-label="Mobile number" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={course} onChange={(e) => setCourse(e.target.value as "ug" | "pg")} className={field} aria-label="Course">
                <option value="ug">MBBS / BDS (NEET UG)</option>
                <option value="pg">MD / MS (NEET PG)</option>
              </select>
              <input value={rank} onChange={(e) => setRank(e.target.value)} inputMode="numeric" placeholder="Rank (optional)" className={`tnum ${field}`} aria-label="Rank" />
            </div>
            <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" aria-hidden="true" />
            {error && (
              <p role="alert" className="text-[13.5px] font-medium text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={state === "saving"}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow disabled:opacity-70"
            >
              {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Call me with my roadmap
            </button>
            <p className="text-center text-[12px] text-muted-foreground">
              <TeamFigure k="years" /> years of counselling · Your details go only to your counsellor.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const RESUME_POINTS = [
  "Every college your rank reaches, with your chance at each",
  "An approximate fee for each one — no surprises later",
  "A shortlist built on your budget, states and quota",
  "A free call with an expert counsellor for your best-seat plan",
];

function ResumeOffer({ firstName, onClose, onGo }: { firstName: string | null; onClose: () => void; onGo: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-h"
        onClick={(e) => e.stopPropagation()}
        className="animate-rise relative w-full max-w-lg overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-glow-lg"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="bg-gradient-to-br from-slate-900 via-cyan-950 to-teal-900 px-6 pb-6 pt-7 text-white">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-cyan-300">Your list is saved</p>
          <h2 id="resume-h" className="font-heading mt-1 text-[1.5rem] font-extrabold leading-tight">
            {firstName ? `${firstName}, your` : "Your"} college list is one minute away
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/80">
            You stopped before the last few questions. Answer them and you get:
          </p>
        </div>
        <div className="p-6">
          <ul className="space-y-2.5">
            {RESUME_POINTS.map((t) => (
              <li key={t} className="flex gap-2.5 text-[14.5px] leading-snug text-foreground">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onGo}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow"
          >
            Finish my profile <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <a
            href="/chat/gulshan-tomar"
            target="_blank"
            rel="noopener"
            onClick={() => trackEvent("nudge_click", { type: "resume_counsellor" })}
            className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3 hover:border-primary/40"
          >
            <img src="/card/gulshan-tomar.jpg" alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-foreground">Talk to an Expert Admission Counsellor</span>
              <span className="block text-[12.5px] text-muted-foreground"><TeamFigure k="years" /> years of NEET counselling · open 10 AM – 10 PM</span>
            </span>
            <WhatsAppIcon className="h-6 w-6 shrink-0 text-[#25D366]" />
          </a>
        </div>
      </div>
    </div>
  );
}
