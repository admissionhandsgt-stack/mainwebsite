import Image from 'next/image';
import { ArrowRight, Globe2, Plus } from 'lucide-react';
import Link from "@/components/ui/Link";
import PhotoCredit, { type PhotoCreditInfo } from "@/components/ui/PhotoCredit";
import { pageCopy } from "@/lib/pageCopy";

interface NRIHeroProps {
  backgroundImageUrl?: string;
  /** Who photographed the campus, and which campus it is. */
  credit?: PhotoCreditInfo;
}

/**
 * The NRI page's hero — light since 2026-10-21, words from Admin → Content → "Page: NRI quota".
 *
 * Its fallback backdrop was an AI picture with "D.Y. PATIL UNIVERSITY" on the building, behind the
 * words about every NRI college; it is gone. With no photograph set in the admin the words stand
 * alone. Server component.
 */
export default async function NRIHero({ backgroundImageUrl, credit }: NRIHeroProps) {
  const copy = await pageCopy("page.nri.hero");
  const photo = backgroundImageUrl && backgroundImageUrl !== "none" ? backgroundImageUrl : null;
  return (
    <section className="relative isolate w-full overflow-hidden border-b border-border bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/80 via-background to-background" />
        <div className="absolute -right-40 -top-48 h-[32rem] w-[32rem] rounded-full bg-secondary/10 blur-[110px]" />
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_55%_at_75%_10%,#000,transparent)]" />
      </div>

      <div className={`container-custom relative grid gap-10 py-10 md:py-14 ${photo ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-center lg:gap-14" : ""}`}>
        <div className="min-w-0">
          <p className="mb-4 flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-strong">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft ring-1 ring-primary/15">
              <Globe2 className="h-4 w-4" aria-hidden="true" />
            </span>
            {copy.eyebrow}
          </p>
          <h1 className="font-heading max-w-[22ch] text-[clamp(2rem,4.4vw,3.35rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground [text-wrap:balance]">
            {copy.title} <span className="text-primary-strong">{copy.accent}</span>
          </h1>
          <p className="mt-5 max-w-[60ch] text-[15.5px] leading-relaxed text-muted-foreground md:text-[17px]">{copy.subtitle}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/nri-quota/colleges"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-strong px-6 text-[15px] font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
            >
              {copy.cta_primary} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#eligibility"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-[15px] font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              {copy.cta_secondary}
            </a>
          </div>
        </div>

        {photo && (
          <div className="relative min-w-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-border bg-surface-3 shadow-lift">
              <Image
                src={photo}
                alt="Medical college campus"
                fill
                priority
                sizes="(min-width: 1024px) 30rem, 100vw"
                className="object-cover"
              />
              <PhotoCredit {...credit} tone="chip" className="absolute right-2.5 top-2.5" />
            </div>
            <div className="relative z-10 -mt-14 ml-4 mr-8 rounded-2xl border border-border bg-card p-5 shadow-lift sm:-mt-16 lg:-ml-8 lg:mr-10">
              <div className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong" aria-hidden="true">
                  <Plus className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-heading text-[16px] font-bold text-foreground">{copy.card_title}</h2>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{copy.card_body}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
