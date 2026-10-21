"use client";

import Image from "next/image";
import PhotoCredit from "@/components/ui/PhotoCredit";
import { motion, useReducedMotion } from "framer-motion";
import { Target, ShieldCheck, Sparkles, GraduationCap, Building2, Landmark } from "lucide-react";
import type { ReactNode } from "react";

export interface PageHeroStat {
  value: string;
  label: string;
  /** A short line under the label — where the figure comes from. */
  note?: string;
}

interface PageHeroProps {
  /** Small line above the headline. Keep it factual, not a marketing label. */
  eyebrow?: string;
  /**
   * Named rather than passed as a component: this is a client component, and a
   * function cannot cross the server/client boundary, so server pages would
   * fail at render if they handed us the icon itself.
   */
  eyebrowIcon?: keyof typeof EYEBROW_ICONS;
  title: ReactNode;
  /** The part of the title that carries the brand gradient. */
  titleAccent?: string;
  subtitle?: string;
  /**
   * Background photograph, or none.
   *
   * Optional on purpose: the alternative to a real picture of the subject is
   * nothing, not a stock campus. Several heroes used to hardcode an
   * AI-generated building signed with a real college's name, which on a page
   * about every other college is a claim rather than decoration.
   */
  image?: string;
  imageAlt?: string;
  /**
   * Which college it is, who took it, and on what terms.
   *
   * The heroes are Wikimedia photographs of real Indian medical colleges, which
   * are CC BY-SA — free to use **and** conditional on crediting the
   * photographer. A credit held only in the database is a condition nobody met,
   * so it is rendered here, quietly, in the corner. See `PhotoCredit`.
   */
  imageSubject?: string | null;
  imageCredit?: string | null;
  imageLicense?: string | null;
  /** How much of the photograph shows through. Dense pages want less. */
  tone?: "light" | "dark";
  stats?: PageHeroStat[];
  children?: ReactNode;
  className?: string;
}

/**
 * The shared hero for every page below the homepage.
 *
 * Light on every page since 2026-10-21 (owner: no more dark heroes). `tone` now says how much the
 * photograph matters, not how dark the hero is:
 * - `tone="dark"` (the photograph is the point): it sits framed on the right, in full colour, with
 *   its credit on it — the same composition as the data pages' DataHero.
 * - `tone="light"`: the page background, with the photograph as a faint wash behind the words.
 * Two drifting ambient lights in the brand hue and a single staggered entrance either way.
 */
const EYEBROW_ICONS = {
  target: Target,
  shield: ShieldCheck,
  sparkles: Sparkles,
  graduation: GraduationCap,
  building: Building2,
  landmark: Landmark,
} as const;

export default function PageHero({
  eyebrow,
  eyebrowIcon,
  title,
  titleAccent,
  subtitle,
  image,
  // Never empty: SEO crawls count an empty alt as missing (the 2026-10-09
  // crawl found it on every page built on this hero).
  imageAlt = "Medical college campus",
  imageSubject,
  imageCredit,
  imageLicense,
  tone = "light",
  stats,
  children,
  className = "",
}: PageHeroProps) {
  const reduce = useReducedMotion();
  const dark = tone === "dark";
  const EyebrowIcon = eyebrowIcon ? EYEBROW_ICONS[eyebrowIcon] : null;

  const stage = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.07, delayChildren: 0.04 } },
  };
  const item = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.2, 0, 0, 1] as const } },
  };
  // The headline and the line under it are not animated in, and that is the
  // point. Framer Motion writes `initial` into the server HTML, so a fade from
  // opacity 0 meant the text arrived in the first response and stayed
  // invisible until the JavaScript had crossed from Montreal and hydrated.
  // On /neet-college-predictor the subtitle is the Largest Contentful Paint,
  // and Lighthouse measured 1.0 s of render delay after the text had already
  // arrived. Everything else here keeps its staggered entrance; the words a
  // visitor came to read are painted with the page.

  // The photograph framed beside the words, or a faint wash behind them.
  const framed = dark && !!image;

  return (
    <section className={`relative w-full overflow-hidden border-b border-border bg-background ${className}`}>
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/70 via-background to-background" />
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_55%_at_75%_10%,#000,transparent)]" />
      </div>

      {image && !framed && (
        <div className="absolute inset-0 z-0">
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-[0.05] sm:opacity-[0.08] dark:opacity-[0.10]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/25 to-background" />
        </div>
      )}

      {/* Ambient brand light */}
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="ambient-blob animate-drift -left-24 -top-32 h-[26rem] w-[26rem] bg-primary/15" />
        <div className="ambient-blob animate-drift-slow right-[-8rem] bottom-[-10rem] h-[22rem] w-[22rem] bg-secondary/15 [animation-delay:-6s]" />
      </div>

      <motion.div
        variants={stage}
        initial="hidden"
        animate="show"
        className={`container-custom relative z-10 py-9 md:py-12 lg:py-14 ${
          framed ? "grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-center lg:gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]" : ""
        }`}
      >
        <div className="min-w-0">
          {eyebrow && (
            <motion.p variants={item} className="mb-4 flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-strong">
              {EyebrowIcon && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft ring-1 ring-primary/15">
                  <EyebrowIcon className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
              {eyebrow}
            </motion.p>
          )}

          <h1 className="font-heading max-w-[22ch] text-[clamp(1.8rem,3.8vw,3rem)] font-extrabold leading-[1.07] tracking-[-0.03em] text-foreground [text-wrap:balance]">
            {title}
            {titleAccent && (
              <>
                {" "}
                <span className="text-primary-strong">{titleAccent}</span>
              </>
            )}
          </h1>

          {subtitle && <p className="mt-4 max-w-[62ch] text-[15.5px] leading-relaxed text-muted-foreground md:text-[17px]">{subtitle}</p>}

          {children && (
            <motion.div variants={item} className="mt-6">
              {children}
            </motion.div>
          )}

          {stats && stats.length > 0 && (
            <motion.dl variants={item} className={`mt-7 grid grid-cols-2 gap-3 ${stats.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
              {stats.map((s) => (
                <div key={s.label} className="flex min-w-0 flex-col rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
                  <dt className="order-2 mt-1 text-[13px] font-semibold leading-snug text-muted-foreground">{s.label}</dt>
                  <dd className="tnum font-heading order-1 text-[1.4rem] font-extrabold leading-tight text-foreground md:text-[1.6rem]">{s.value}</dd>
                  {s.note && <dd className="order-3 mt-0.5 text-[12px] leading-snug text-muted-foreground">{s.note}</dd>}
                </div>
              ))}
            </motion.dl>
          )}
        </div>

        {framed && (
          <motion.div variants={item} className="relative min-w-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-border bg-surface-3 shadow-lift">
              <Image
                src={image}
                alt={imageAlt}
                fill
                priority
                sizes="(min-width: 1280px) 30rem, (min-width: 1024px) 27rem, 100vw"
                className="object-cover"
              />
              {/* The photographer's credit — a licence condition, not a courtesy. */}
              <PhotoCredit
                subject={imageSubject}
                attribution={imageCredit}
                license={imageLicense}
                tone="chip"
                className="absolute right-2.5 top-2.5"
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {!framed && (
        <PhotoCredit
          subject={imageSubject}
          attribution={imageCredit}
          license={imageLicense}
          tone="onSurface"
          className="absolute bottom-1.5 right-2 z-20"
        />
      )}
    </section>
  );
}
