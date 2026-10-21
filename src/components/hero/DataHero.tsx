import type { ReactNode } from "react";
import Image from "next/image";
import {
  BarChart3,
  Building2,
  GraduationCap,
  IndianRupee,
  Landmark,
  MapPinned,
  Search,
  ScrollText,
  Stethoscope,
} from "lucide-react";
import Link from "@/components/ui/Link";
import PhotoCredit from "@/components/ui/PhotoCredit";
import TelegramLink from "@/components/engage/TelegramLink";
import PulseLine from "@/components/graphics/PulseLine";
import type { HeroImage } from "@/lib/pageCopy";

/**
 * The hero for every data page — cutoffs, stipends, fees, states, branches.
 *
 * Light since 2026-10-21 (owner: "light theme mai light background with some relevant images ...
 * doctors, labs, medicine"). It had been a navy block with glowing glass; on a site that is read for
 * its numbers the dark heroes made every page feel heavy, and the owner asked for them gone.
 *
 * Words on the left; on the right a photograph in a frame with the page's own data card (`visual`:
 * HeroBars, HeroFacts) laid over its foot, so the picture sets the scene and the card carries the
 * content. The photograph is set in Admin → Media (lib/pageCopy.ts) and is of the subject or generic
 * — a specialty at work, a lab, an exam hall — never a stock campus passed off as a named college;
 * its credit rides on it. With no photograph the card stands alone over a faint line-drawn mark.
 *
 * The H1 is never animated in. Colours are the theme's tokens, so dark mode keeps working. Server
 * component.
 */
export interface DataHeroStat {
  label: string;
  value: string;
  note?: string;
}

const TOPIC = {
  money: IndianRupee,
  map: MapPinned,
  branch: Stethoscope,
  chart: BarChart3,
  college: Building2,
  course: GraduationCap,
  document: ScrollText,
  authority: Landmark,
} as const;
export type HeroTopic = keyof typeof TOPIC;

export default function DataHero({
  crumbs,
  eyebrow,
  title,
  accent,
  subtitle,
  stats = [],
  cta,
  telegram,
  source,
  visual,
  image,
  topic = "chart",
}: {
  crumbs: { label: string; href?: string }[];
  eyebrow?: string;
  title: ReactNode;
  /** The part of the H1 set in the brand gradient. */
  accent?: string;
  subtitle?: ReactNode;
  stats?: DataHeroStat[];
  cta?: { label: string; href: string };
  /** The Telegram link's data-placement; omit to leave it out. */
  telegram?: string;
  /** Where the figures come from, and when. Shown under the actions. */
  source?: ReactNode;
  visual?: ReactNode;
  /** A photograph set in the admin (see lib/pageCopy.ts). Optional. */
  image?: HeroImage;
  /** The line-drawn mark behind the panel when there is no photograph. */
  topic?: HeroTopic;
}) {
  const Mark = TOPIC[topic];
  return (
    <section className="relative isolate overflow-hidden border-b border-border bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/80 via-background to-background" />
        <div className="absolute -right-40 -top-48 h-[32rem] w-[32rem] rounded-full bg-secondary/10 blur-[110px]" />
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_55%_at_75%_10%,#000,transparent)]" />
      </div>
      <PulseLine className="absolute inset-x-0 bottom-3 -z-10 hidden h-12 w-full opacity-40 lg:block" />

      <div
        className={`container-custom relative grid gap-10 pb-12 pt-7 md:pb-14 md:pt-10 ${
          visual || image ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-start lg:gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]" : ""
        }`}
      >
        <div className="min-w-0 lg:pt-4">
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`}>
                {i > 0 && <span className="mx-2 text-border" aria-hidden="true">/</span>}
                {c.href ? (
                  <Link href={c.href} className="hover:text-foreground hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground" aria-current="page">
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
          {eyebrow && (
            <p className="mb-4 flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-strong">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft ring-1 ring-primary/15">
                <Mark className="h-4 w-4" aria-hidden="true" />
              </span>
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading max-w-[24ch] text-[clamp(2rem,4.2vw,3.2rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground [text-wrap:balance]">
            {title}
            {accent && (
              <>
                {" "}
                <span className="text-primary-strong">{accent}</span>
              </>
            )}
          </h1>
          {subtitle && <p className="mt-4 max-w-[62ch] text-[15.5px] leading-relaxed text-muted-foreground md:text-[17px]">{subtitle}</p>}
          {stats.length > 0 && (
            <dl className={`mt-7 grid grid-cols-2 gap-3 ${stats.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              {stats.map((s) => (
                <div key={s.label} className="flex min-w-0 flex-col rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
                  <dt className="order-2 mt-1 text-[13px] font-semibold leading-snug text-muted-foreground">{s.label}</dt>
                  <dd className="tnum font-heading order-1 text-[1.4rem] font-extrabold leading-tight text-foreground md:text-[1.6rem]">{s.value}</dd>
                  {/* Wraps rather than truncates: "college × course × cate…" on a phone told nobody anything. */}
                  {s.note && <dd className="order-3 mt-0.5 text-[12px] leading-snug text-muted-foreground">{s.note}</dd>}
                </div>
              ))}
            </dl>
          )}
          {(cta || telegram) && (
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {cta && (
                <Link
                  href={cta.href}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary-strong px-6 py-3 text-[15px] font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Search className="h-4 w-4" aria-hidden="true" /> {cta.label}
                </Link>
              )}
              {telegram && (
                <TelegramLink
                  placement={telegram}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-5 text-[15px] font-semibold text-foreground transition-colors hover:border-primary/40"
                  iconClassName="text-[#229ED9]"
                >
                  Updates on Telegram
                </TelegramLink>
              )}
            </div>
          )}
          {source && <p className="mt-5 max-w-[62ch] text-[12.5px] leading-relaxed text-muted-foreground">{source}</p>}
        </div>

        {(visual || image) && (
          <div className="relative min-w-0">
            {image ? (
              <>
                <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border border-border bg-surface-3 shadow-lift">
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    priority
                    sizes="(min-width: 1280px) 30rem, (min-width: 1024px) 27rem, 100vw"
                    className="object-cover"
                  />
                  {(image.attribution || image.subject) && (
                    <PhotoCredit
                      subject={image.subject}
                      attribution={image.attribution}
                      license={image.license}
                      tone="chip"
                      className="absolute right-2.5 top-2.5"
                    />
                  )}
                </div>
                {visual && <div className="relative z-10 -mt-16 px-3 sm:-mt-20 sm:px-6 lg:-ml-10 lg:mr-4 lg:px-0">{visual}</div>}
              </>
            ) : (
              <>
                <Mark
                  className="pointer-events-none absolute -right-10 -top-12 -z-10 hidden h-80 w-80 text-primary/[0.07] lg:block"
                  strokeWidth={0.7}
                  aria-hidden="true"
                />
                {visual}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
