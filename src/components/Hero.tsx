"use client";

import Image from "next/image";
import PhotoCredit from "@/components/ui/PhotoCredit";
import { motion, useReducedMotion } from "framer-motion";
import { useCTA } from "@/hooks/useCTA";
import { ArrowRight, Building2, Users, ShieldCheck, Landmark, Layers, Phone, Sparkles } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

/** Everything an editor can change here. Each field falls back to the copy
 *  that shipped, so a missing setting never leaves the hero blank. */
export interface HeroCopy {
  badgeLeft?: string;
  badgeRight?: string;
  headline?: string;
  headlineAccent?: string;
  subtitle?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
}

interface HeroProps {
  backgroundImageUrl?: string;
  /**
   * Which college the backdrop shows, who photographed it, and the terms.
   *
   * The hero is a Wikimedia photograph of a real Indian medical college now,
   * replacing an AI-generated one that carried a real college's name with
   * SCIENCES misspelt on its board. CC BY-SA is free and conditional, so the
   * credit is rendered rather than merely stored — see `PhotoCredit`.
   */
  backgroundSubject?: string | null;
  backgroundCredit?: string | null;
  backgroundLicense?: string | null;
  doctorsImageUrl?: string;
  copy?: HeroCopy;
}

/**
 * How the answers here are made — the hero's trust element.
 *
 * This replaced three counts ("1,687 MBBS colleges" against a real 834 that
 * teach MBBS), and then replaced the counts that were correct too. Volume is
 * the weakest thing a counselling site can claim: every competitor claims a
 * bigger database and a higher accuracy percentage, none of it is checkable,
 * and it describes our warehouse rather than the visitor's problem. What
 * cannot be copied is the method — and the middle one is a promise our
 * competitors cannot make, because they sell a forecast and we publish the
 * authority's own result.
 *
 * Three words each, on one line. The first version of this gave every point a
 * sentence of explanation, which pushed the hero past the fold and turned a
 * signal into an essay. A hero has room for a mark of quality, not an
 * argument for one; the argument belongs further down the page.
 */
const ASSURANCES = [
  { icon: Landmark, label: "From the authorities" },
  { icon: ShieldCheck, label: "Published, not predicted" },
  { icon: Layers, label: "Every round, not the last" },
];

const DEFAULTS: Required<Omit<HeroCopy, "stats">> = {
  badgeLeft: "NEET 2026 counselling",
  badgeRight: "Real cutoffs, not estimates",
  headline: "MBBS & PG admission",
  headlineAccent: "in India, made simple",
  subtitle:
    "Every closing rank, fee and seat from the last two counselling years — turned into one straight answer about where your seat actually is.",
  ctaPrimary: "Get expert guidance",
  ctaSecondary: "Browse top colleges",
};

export default function Hero({
  backgroundImageUrl,
  backgroundSubject,
  backgroundCredit,
  backgroundLicense,
  doctorsImageUrl,
  copy,
}: HeroProps) {
  const CTA = useCTA();
  const reduce = useReducedMotion();

  const text = { ...DEFAULTS, ...Object.fromEntries(
    Object.entries(copy ?? {}).filter(([, v]) => typeof v === "string" && v !== ""),
  ) } as Required<HeroCopy>;

  // One orchestrated entrance on load. Nothing else on the page animates in.
  const stage = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.07, delayChildren: 0.05 } },
  };
  const item = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.2, 0, 0, 1] as const } },
  };

  return (
    <section className="relative w-full overflow-hidden bg-background lg:min-h-[min(760px,calc(100svh-112px))] flex items-center">
      {/* Ambient light — the page's only continuous motion */}
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="ambient-blob animate-drift -left-32 -top-40 h-[34rem] w-[34rem] bg-primary/25 dark:bg-primary/20" />
        <div className="ambient-blob animate-drift-slow left-[42%] top-24 h-[26rem] w-[26rem] bg-secondary/20 dark:bg-secondary/15" />
        <div className="ambient-blob animate-drift -bottom-40 right-[-6rem] h-[28rem] w-[28rem] bg-accent/15 dark:bg-accent/10 [animation-delay:-7s]" />
      </div>

      {/* Campus photograph, held well behind the type */}
      {backgroundImageUrl && backgroundImageUrl !== "none" && (
        <div className="absolute inset-0 z-0" aria-hidden="true">
          <Image
            src={backgroundImageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-[0.035] sm:opacity-[0.07] dark:opacity-[0.08] dark:sm:opacity-[0.10]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background sm:from-background/40 sm:via-transparent" />
        </div>
      )}

      <div className="container-custom relative z-10 w-full flex flex-col lg:flex-row items-center justify-between gap-10 py-12 lg:py-16">
        {/* ---------------- Left: the message ---------------- */}
        <motion.div
          variants={stage}
          initial="hidden"
          animate="show"
          className="w-full lg:w-[56%] flex flex-col text-center lg:text-left"
        >
          <motion.div variants={item} className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 sm:px-3 sm:py-1.5 text-[13px] sm:text-[11px] font-semibold uppercase tracking-wider text-accent dark:text-accent">
              <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {text.badgeLeft}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-2.5 py-1 sm:px-3 sm:py-1.5 text-[13px] sm:text-[11px] font-semibold uppercase tracking-wider text-primary-strong dark:text-primary">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {text.badgeRight}
            </span>
          </motion.div>

          {/*
            The headline and subtitle are painted with the server HTML rather
            than faded in. Framer Motion writes `initial` into the HTML, so an
            opacity-0 start kept the words invisible until the JavaScript had
            crossed from Montreal and hydrated — the visitor saw an empty hero
            for most of a second with the text already delivered. The badges,
            buttons and trust row keep the staggered entrance.
          */}
          <h1
            className="font-heading text-[clamp(2.25rem,5.2vw,4.25rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-foreground mb-5"
          >
            {text.headline}
            <br className="hidden sm:block" />{" "}
            <span className="text-gradient-brand">{text.headlineAccent}</span>
          </h1>

          <p
            className="max-w-[54ch] mx-auto lg:mx-0 text-base md:text-[17px] leading-relaxed text-muted-foreground mb-8"
          >
            {text.subtitle}
          </p>

          <motion.div variants={item} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
            <button
              onClick={() => CTA.counselling()}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition-all duration-200 hover:shadow-glow-lg hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Users className="h-4 w-4" />
              {text.ctaPrimary}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => {
                document.getElementById("top-medical-institutes")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-bold text-foreground shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary-soft hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Building2 className="h-4 w-4 text-primary" />
              {text.ctaSecondary}
            </button>
          </motion.div>

          {/* ---------------------- how this is made ---------------------- */}
          {/*
            One chip per row on a phone, always. With flex-wrap the row count
            depended on text width: in the fallback font the three chips fit in
            two rows, in Inter they need three, so the hero grew 54px a round
            trip after first paint and everything anchored to its bottom moved
            with it — measured at 412px, the whole of the homepage's layout
            shift once the alerts bar stopped causing one. Stacked is exactly
            what a phone shows once the font has loaded, so nothing looks
            different; it just no longer jumps. From 480px up there is room for
            the row in either font.
          */}
          <motion.ul
            variants={item}
            aria-label="How every answer here is made"
            className="mt-8 flex flex-col items-center gap-2 xs:flex-row xs:flex-wrap xs:justify-center lg:justify-start"
          >
            {ASSURANCES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 py-2 pl-2 pr-3.5 shadow-sm backdrop-blur-sm"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-[12.5px] font-bold tracking-tight text-foreground">
                  {label}
                </span>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* ---------------- Right: the people, and the way in ---------------- */}
        <motion.div
          initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.2, 0, 0, 1] }}
          className="relative hidden lg:flex w-full lg:w-[42%] justify-end items-end h-[clamp(430px,62svh,620px)]"
        >
          {doctorsImageUrl && doctorsImageUrl !== "none" && (
            <div className="relative h-full w-full max-w-[520px]">
              <Image
                src={doctorsImageUrl}
                alt="AdmissionHands counselling team"
                fill
                priority
                sizes="(max-width: 1024px) 0px, 520px"
                className="object-contain object-bottom drop-shadow-2xl"
              />
            </div>
          )}

          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.2, 0, 0, 1] }}
            className="panel-glass card-lift absolute bottom-10 -right-2 z-20 w-[320px] rounded-2xl p-4 shadow-lift"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => CTA.whatsapp()}
                aria-label="Message an expert on WhatsApp"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent-soft text-accent transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <WhatsAppIcon size={20} />
              </button>
              <div className="text-left">
                <h2 className="font-heading text-sm font-bold leading-tight text-foreground">
                  Not sure where your rank lands?
                </h2>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Talk to a NEET counsellor
                </p>
              </div>
            </div>
            <button
              onClick={() => CTA.call()}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand text-xs font-bold text-white shadow-glow transition-all hover:shadow-glow-lg active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Phone size={14} />
              Call now — free
            </button>
          </motion.div>
        </motion.div>
      </div>
      <PhotoCredit
        subject={backgroundSubject}
        attribution={backgroundCredit}
        license={backgroundLicense}
        tone="onSurface"
        className="absolute bottom-1.5 right-2 z-20"
      />
    </section>
  );
}
