"use client";

import Image from "next/image";
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
  doctorsImageUrl?: string;
  copy?: HeroCopy;
}

/**
 * How the answers here are made — the hero's trust element.
 *
 * This replaced three counts ("1,687 MBBS colleges" against a real 834 that
 * teach MBBS), and then replaced the counts that were correct too.
 *
 * Volume is the weakest thing a counselling site can put in front of someone.
 * Every competitor claims a bigger database and a higher accuracy percentage,
 * none of it is checkable, and a visitor has learned nothing from reading it.
 * It also describes our warehouse rather than their problem.
 *
 * What cannot be copied is the method. Each line below is a commitment the
 * product actually keeps, and the second one is a commitment our competitors
 * cannot make at all, because they publish a forecast and we publish the
 * authority's own result.
 */
const ASSURANCES = [
  {
    icon: Landmark,
    title: "Straight from the counselling authorities",
    body: "MCC, the state authorities and the deemed universities — read from their own published results.",
  },
  {
    icon: ShieldCheck,
    title: "Published, never predicted",
    body: "We show where the cut actually landed. We do not invent a cutoff and we do not sell a percentage.",
  },
  {
    icon: Layers,
    title: "Every round, not just the last one",
    body: "A final round can close tighter than the second. Reading only the last one hides seats you could have had.",
  },
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

export default function Hero({ backgroundImageUrl, doctorsImageUrl, copy }: HeroProps) {
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

          <motion.h1
            variants={item}
            className="font-heading text-[clamp(2.25rem,5.2vw,4.25rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-foreground mb-5"
          >
            {text.headline}
            <br className="hidden sm:block" />{" "}
            <span className="text-gradient-brand">{text.headlineAccent}</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="max-w-[54ch] mx-auto lg:mx-0 text-base md:text-[17px] leading-relaxed text-muted-foreground mb-8"
          >
            {text.subtitle}
          </motion.p>

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
          <motion.div
            variants={item}
            className="mt-8 max-w-xl mx-auto lg:mx-0 overflow-hidden rounded-2xl border border-border/80 bg-card/70 backdrop-blur-sm shadow-lift"
          >
            <p className="flex items-center gap-2.5 border-b border-border/70 bg-primary-soft/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-strong dark:text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              How every answer here is made
            </p>

            <ul className="divide-y divide-border/70">
              {ASSURANCES.map(({ icon: Icon, title, body }) => (
                // `text-left` because the hero centres everything on a phone,
                // and a centred body line under a heading reads as a poem.
                <li key={title} className="flex gap-3.5 px-4 py-3.5 text-left">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold leading-snug text-foreground">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted-foreground">
                      {body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
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
    </section>
  );
}
