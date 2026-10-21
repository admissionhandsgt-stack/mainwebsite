"use client";

import Image from "next/image";
import { ArrowRight, CheckCircle2, Phone, Stethoscope } from "lucide-react";
import Link from "@/components/ui/Link";
import { useCTA } from "@/hooks/useCTA";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import PhotoCredit, { type PhotoCreditInfo } from "@/components/ui/PhotoCredit";

export interface PGHeroCopy {
  eyebrow: string;
  title: string;
  accent: string;
  subtitle: string;
  cta_call: string;
  cta_whatsapp: string;
  wa_text: string;
  browse?: string;
}

interface PGHeroProps {
  /** Admin → Content → "Page: MD/MS overview", with the live figures already filled in. */
  copy: PGHeroCopy;
  /**
   * The short facts under the buttons, already worded: each from an official count (NMC's register,
   * MCC's matrix), the published results we hold, or the team's own figure from the admin. A fact
   * with no figure is left out rather than shown with a guess.
   */
  facts: string[];
  imageUrl?: string;
  imageAlt?: string;
  /** Who photographed it, and which place it is. */
  credit?: PhotoCreditInfo;
}

/**
 * The MD/MS overview's hero — light since 2026-10-21, like every hero on the site: words on the left,
 * the admin's photograph framed on the right. It said "2,168 PG colleges", which was every row in our
 * PG list — 1,536 of them DNB-only hospitals, some hospitals twice — and "NEET PG 2025-26" a season
 * late. The counts now come from NMC and MCC, the words from the admin.
 */
export const PGHero = ({ copy, facts, imageUrl, imageAlt, credit }: PGHeroProps) => {
  const CTA = useCTA();
  const photo = imageUrl && imageUrl !== "none" ? imageUrl : null;

  return (
    <section id="pg-hero" className="relative isolate overflow-hidden border-b border-border bg-background" aria-labelledby="pg-hero-title">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/80 via-background to-background" />
        <div className="absolute -right-40 -top-48 h-[32rem] w-[32rem] rounded-full bg-secondary/10 blur-[110px]" />
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_55%_at_75%_10%,#000,transparent)]" />
      </div>

      <div
        className={`container-custom relative grid gap-10 py-10 md:py-14 ${
          photo ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center lg:gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]" : ""
        }`}
      >
        <div className="min-w-0">
          {copy.eyebrow && (
            <p className="mb-4 flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-strong">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft ring-1 ring-primary/15">
                <Stethoscope className="h-4 w-4" aria-hidden="true" />
              </span>
              {copy.eyebrow}
            </p>
          )}

          <h1
            id="pg-hero-title"
            className="font-heading max-w-[22ch] text-[clamp(2rem,4.4vw,3.35rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground [text-wrap:balance]"
          >
            {copy.title}
            {copy.accent && (
              <>
                {" "}
                <span className="text-primary-strong">{copy.accent}</span>
              </>
            )}
          </h1>

          {copy.subtitle && (
            <p className="mt-5 max-w-[60ch] text-[15.5px] leading-relaxed text-muted-foreground md:text-[17px]">{copy.subtitle}</p>
          )}

          <div className="mt-7 flex flex-col gap-3 xs:flex-row">
            <button
              type="button"
              onClick={() => CTA.call()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-strong px-6 text-[15px] font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" /> {copy.cta_call}
            </button>
            <button
              type="button"
              onClick={() => CTA.whatsapp(copy.wa_text)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-[15px] font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              <WhatsAppIcon size={17} /> {copy.cta_whatsapp}
            </button>
          </div>
          {copy.browse && (
            <Link
              href="/md-ms-india/colleges"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[14.5px] font-semibold text-primary-strong hover:underline"
            >
              {copy.browse} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}

          {facts.length > 0 && (
            <ul className="mt-7 grid max-w-2xl gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {facts.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[14px] font-medium leading-snug text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {photo && (
          <div className="relative min-w-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-border bg-surface-3 shadow-lift">
              <Image
                src={photo}
                alt={imageAlt || "PG residents at work in a hospital"}
                fill
                priority
                sizes="(min-width: 1280px) 32rem, (min-width: 1024px) 28rem, 100vw"
                className="object-cover"
              />
              <PhotoCredit {...credit} tone="chip" className="absolute right-2.5 top-2.5" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
