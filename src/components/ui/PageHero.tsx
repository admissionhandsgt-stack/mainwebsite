"use client";

import Image from "next/image";
import PhotoCredit from "@/components/ui/PhotoCredit";
import { motion, useReducedMotion } from "framer-motion";
import { Target, ShieldCheck, Sparkles, GraduationCap, Building2, Landmark } from "lucide-react";
import type { ReactNode } from "react";

export interface PageHeroStat {
  value: string;
  label: string;
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
 * One treatment everywhere: the page's own photograph, held back behind a
 * gradient so type stays readable, two drifting ambient lights in the brand
 * hue, and a single staggered entrance. `tone="dark"` puts white type over a
 * darkened photo (used where the image is the point, e.g. campuses);
 * `tone="light"` keeps the page background and lets the photo sit at low
 * opacity behind it.
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

  return (
    <section
      className={`relative w-full overflow-hidden ${dark ? "bg-slate-950" : "bg-background"} ${className}`}
    >
      {/* Photograph */}
      <div className="absolute inset-0 z-0" aria-hidden={imageAlt ? undefined : true}>
        {image && (
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            className={
              dark
                ? "object-cover object-center opacity-60"
                : "object-cover object-center opacity-[0.05] sm:opacity-[0.09] dark:opacity-[0.10]"
            }
          />
        )}
        {dark ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/25 to-background" />
        )}
      </div>

      {/* Ambient brand light */}
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="ambient-blob animate-drift -left-24 -top-32 h-[26rem] w-[26rem] bg-primary/25" />
        <div className="ambient-blob animate-drift-slow right-[-8rem] bottom-[-10rem] h-[22rem] w-[22rem] bg-secondary/20 [animation-delay:-6s]" />
      </div>

      <motion.div
        variants={stage}
        initial="hidden"
        animate="show"
        className="container-custom relative z-10 py-9 md:py-12 lg:py-14"
      >
        {eyebrow && (
          <motion.div variants={item} className="mb-5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                dark
                  ? "border border-white/20 bg-white/10 text-cyan-200 backdrop-blur-sm"
                  : "border border-primary/25 bg-primary-soft text-primary-strong dark:text-primary"
              }`}
            >
              {EyebrowIcon && <EyebrowIcon className="h-3.5 w-3.5" />}
              {eyebrow}
            </span>
          </motion.div>
        )}

        <h1
          className={`font-heading max-w-[22ch] text-[clamp(1.75rem,3.6vw,2.9rem)] font-extrabold leading-[1.08] tracking-[-0.03em] ${
            dark ? "text-white" : "text-foreground"
          }`}
        >
          {title}
          {titleAccent && (
            <>
              {" "}
              <span className={dark ? "bg-gradient-to-r from-cyan-300 to-teal-200 bg-clip-text text-transparent" : "text-gradient-brand"}>
                {titleAccent}
              </span>
            </>
          )}
        </h1>

        {subtitle && (
          <p
            className={`mt-4 max-w-[62ch] text-[15px] md:text-base leading-relaxed ${
              dark ? "text-slate-300" : "text-muted-foreground"
            }`}
          >
            {subtitle}
          </p>
        )}

        {children && (
          <motion.div variants={item} className="mt-6">
            {children}
          </motion.div>
        )}

        {stats && stats.length > 0 && (
          <motion.div
            variants={item}
            className={`mt-7 grid grid-cols-2 gap-4 border-t pt-6 sm:gap-8 md:max-w-3xl md:grid-cols-4 ${
              dark ? "border-white/15" : "border-border/70"
            }`}
          >
            {stats.map((s) => (
              <div key={s.label}>
                <div
                  className={`tnum font-heading text-2xl md:text-3xl font-extrabold leading-none ${
                    dark ? "text-white" : "text-foreground"
                  }`}
                >
                  {s.value}
                </div>
                <div
                  className={`mt-1.5 text-[11px] font-medium uppercase tracking-wide ${
                    dark ? "text-slate-400" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* The photographer's credit — a licence condition, not a courtesy. */}
      <PhotoCredit
        subject={imageSubject}
        attribution={imageCredit}
        license={imageLicense}
        tone={dark ? "onImage" : "onSurface"}
        className="absolute bottom-1.5 right-2 z-20"
      />
    </section>
  );
}
