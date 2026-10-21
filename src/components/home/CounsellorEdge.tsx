import Link from "@/components/ui/Link";
import {
  ArrowRight,
  CalendarClock,
  FileCheck2,
  Network,
  PhoneCall,
  Route,
  Scale,
  ShieldAlert,
  TrendingUp,
  Layers,
  Shuffle,
  Wallet,
} from "lucide-react";
import { CONTACT_INFO } from "@/lib/constants";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { getCounsellingFacts } from "@/lib/counsellingFacts";
import { TeamFigure } from "@/components/engage/TeamFigures";

/**
 * Why a cutoff list is not a counsellor (2026-10-12).
 *
 * Published closing ranks answer "where did seats close last year". The
 * decisions that win or lose a seat — what to fill first, when to float, which
 * quota, which documents — are not in any table. The numbers in the first row
 * are counted from our own data (lib/counsellingFacts.ts), so they cannot
 * drift; what the counsellors bring is the team's own account of their work.
 */

const GOLDEN_SEAT_MISTAKES = [
  "Locking a round-1 seat that a later round would have upgraded to a better college.",
  "The right colleges in the wrong order — the same list, filled differently, lands a different seat.",
  "A state registration window missed while waiting on MCC — or a registration under the wrong quota.",
  "Turned away at reporting over a single document — a domicile, category or PwD certificate in the wrong format.",
  "Lakhs paid for a management seat when a merit seat was one round away.",
];

const WHAT_WE_BRING = [
  {
    icon: Network,
    title: "Live insight from across India",
    body: "Our counsellors stay in daily touch with counselling networks nationwide. Round trends, fresh vacancies and seat-matrix changes reach us as they happen — not a year later in a PDF.",
  },
  {
    icon: PhoneCall,
    title: "Straight answers from colleges",
    body: "We speak to colleges directly: the real fee, hidden charges, bond terms and hostel costs — confirmed before you commit a rupee.",
  },
  {
    icon: Route,
    title: "A personal choice-filling roadmap",
    body: "Safe, target and dream colleges in the order that works for your rank, category and budget — reworked after every round.",
  },
  {
    icon: Shuffle,
    title: "The float-or-freeze call",
    body: "Before every round, a clear recommendation — hold your seat or go for the upgrade — and the reasoning behind it.",
  },
  {
    icon: Scale,
    title: "Every route you qualify for",
    body: "All India, your home state, other states, deemed and private — every quota open to you mapped, and the one that gives you the best seat.",
  },
  {
    icon: CalendarClock,
    title: "Deadlines and documents, handled",
    body: "Registration windows, fee deadlines and the exact certificates each counselling asks for — tracked, reminded and checked.",
  },
];

const inr = (n: number) => n.toLocaleString("en-IN");

export default async function CounsellorEdge({ compact = false }: { compact?: boolean }) {
  const f = await getCounsellingFacts();
  const wa = CONTACT_INFO.whatsapp.replace(/\D/g, "");
  const waHref = `https://wa.me/${wa}?text=${encodeURIComponent(
    "Hello AdmissionHands counsellor, I would like a counselling roadmap for my NEET rank.",
  )}`;

  const facts = f
    ? [
        {
          icon: TrendingUp,
          value: `${f.movedAfterR1.pg}%`,
          text: `of PG seat options went to a later rank after round 1 (${f.movedAfterR1.ug}% in NEET UG). Lock your seat too early and the upgrade goes to someone else.`,
        },
        {
          icon: Layers,
          value: inr(f.counsellings.ug + f.counsellings.pg),
          text: `different counselling processes — ${f.counsellings.ug} for NEET UG, ${f.counsellings.pg} for NEET PG — each with its own rules, dates and documents.`,
        },
        {
          icon: ShieldAlert,
          value: `1 in ${f.lastRoundTighter.of ? Math.round(f.lastRoundTighter.of / Math.max(1, f.lastRoundTighter.seats)) : 10}`,
          text: `PG seats${f.lastRoundTighter.year ? ` in ${f.lastRoundTighter.year}` : ""} closed tighter in the final round than in an earlier one. Judge a seat by its last round alone and you will misread it.`,
        },
        {
          icon: FileCheck2,
          value: inr(f.categoryCodes),
          text: `category codes and ${inr(f.quotaTypes)} quota types across India. The same category is written differently from state to state — and one wrong pick is costly.`,
        },
        {
          icon: Wallet,
          value: inr(f.feeFiveX),
          text: "PG colleges where one seat costs five times another. What you pay depends on the quota — not just the college.",
        },
      ]
    : [];
  const shown = compact ? facts.slice(0, 3) : facts;

  const ctas = (
    <div className={`flex flex-wrap gap-3 ${compact ? "" : "justify-center"}`}>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(37,211,102,0.3)] hover:bg-[#1fbf5b]"
      >
        <WhatsAppIcon className="h-5 w-5" /> Get my personal counselling roadmap
      </a>
      <Link
        href="/neet-college-predictor"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-[15px] font-bold text-foreground hover:border-primary/40"
      >
        Check my chances first <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );

  const factList = shown.length > 0 && (
    <>
      <ul className={`grid gap-3 ${compact ? "mt-6 sm:grid-cols-3" : "mt-10 sm:grid-cols-2 lg:grid-cols-5"}`}>
        {shown.map((x) => (
          <li key={x.value + x.text.slice(0, 12)} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <x.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <p className="tnum font-heading mt-3 text-[2rem] font-extrabold leading-none text-foreground">{x.value}</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{x.text}</p>
          </li>
        ))}
      </ul>
      <p className={`mt-3 text-[11.5px] text-muted-foreground ${compact ? "" : "text-center"}`}>
        Counted from the official counselling results we hold — not estimates.
      </p>
    </>
  );

  /* ---------------- compact: one card, for the college pages and the homepage ---------------- */
  if (compact) {
    return (
      <section className="rounded-3xl border border-primary/25 bg-surface-2 p-6 md:p-8" aria-label="The difference a counsellor makes">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="inline-flex items-center rounded-full border border-primary/25 bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-strong dark:text-primary">
              The difference a counsellor makes
            </p>
            <h2 className="font-heading mt-3 text-[clamp(1.35rem,2.6vw,1.8rem)] font-extrabold leading-tight text-foreground">
              Your rank opens the door. <span className="text-gradient-brand">Strategy gets you the seat.</span>
            </h2>
            <p className="mt-2 max-w-[64ch] text-[14.5px] leading-relaxed text-muted-foreground">
              Which choice to lock, when to float, which quota is yours — the calls that decide your seat, made with you
              round by round.
            </p>
          </div>
          {ctas}
        </div>
        {factList}
      </section>
    );
  }

  /* ---------------- full ---------------- */
  return (
    <section className="py-16 md:py-24" aria-labelledby="edge-h">
      <div className="container-custom">
        <header className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center rounded-full border border-primary/25 bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-strong dark:text-primary">
            The difference a counsellor makes
          </p>
          <h2
            id="edge-h"
            className="font-heading mt-4 text-[clamp(1.8rem,3.8vw,2.75rem)] font-extrabold leading-[1.1] text-foreground"
          >
            Your rank opens the door. <span className="text-gradient-brand">Strategy gets you the seat.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[64ch] text-[16px] leading-relaxed text-muted-foreground">
            Cutoff lists show where seats closed last year. They cannot tell you which choice to lock first, when to float
            for an upgrade, which quota is genuinely yours, or what a college will actually charge. Those calls decide your
            seat — and they are made in days, not weeks. That is where <TeamFigure k="years" /> years of counselling, and a team in touch with
            colleges and counsellors across India, works for you.
          </p>
        </header>

        {factList}

        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col rounded-3xl border border-signal-stretch/25 bg-card p-6 shadow-sm md:p-8">
            <h3 className="font-heading text-[1.25rem] font-extrabold text-foreground">Where golden seats are lost</h3>
            <p className="mt-1 text-[14px] text-muted-foreground">The five mistakes we see every single season.</p>
            <ol className="mt-5 space-y-4">
              {GOLDEN_SEAT_MISTAKES.map((m, i) => (
                <li key={m} className="flex gap-3.5 text-[15px] leading-relaxed text-foreground">
                  <span className="tnum font-heading inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-stretch/10 text-[14px] font-extrabold text-signal-stretch">
                    {i + 1}
                  </span>
                  <span className="pt-1">{m}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 border-t border-border pt-5 text-[15px] font-semibold text-foreground lg:mt-auto">
              Every one of these is avoidable — with the right guidance at the right moment.
            </p>
          </div>

          <div className="flex flex-col rounded-3xl border border-primary/20 bg-card p-6 shadow-sm md:p-8">
            <h3 className="font-heading text-[1.25rem] font-extrabold text-foreground">
              What you get with an AdmissionHands counsellor
            </h3>
            <p className="mt-1 text-[14px] text-muted-foreground">The work behind every seat we help secure.</p>
            <ul className="mt-5 grid flex-1 gap-3 sm:grid-cols-2">
              {WHAT_WE_BRING.map((w) => (
                <li key={w.title} className="rounded-2xl border border-border bg-surface-2 p-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <w.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <h4 className="font-heading text-[15px] font-bold leading-snug text-foreground">{w.title}</h4>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{w.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-primary/25 bg-surface-2 px-6 py-7 text-center md:px-10">
          <p className="font-heading text-[1.2rem] font-extrabold text-foreground">
            Talk to a counsellor before your next round — not after it.
          </p>
          <p className="mt-1 text-[14px] text-muted-foreground">Open daily, 10 AM – 10 PM · <TeamFigure k="years" /> years of NEET counselling</p>
          <div className="mt-5">{ctas}</div>
        </div>
      </div>
    </section>
  );
}
