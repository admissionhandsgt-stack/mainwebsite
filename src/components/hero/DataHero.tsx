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
 * The hero for every data page — cutoffs, stipends, fees, states, branches
 * (2026-10-18, rebuilt the same day after the owner found the first version
 * bland). Before it, each page hand-built a flat navy block with words on the
 * left and an empty right half.
 *
 * Two looks, chosen by whether the admin has given the page a photograph:
 *
 * - **Split** — the photograph fills the right side and fades into the navy;
 *   the data panel sits on it as glass. The photograph is credited, and is of
 *   the subject or generic (a specialty at work, an exam hall), never a stock
 *   campus passed off as a named college.
 * - **Composed** — no photograph: layered light, a faint grid, a large
 *   line-drawn topic mark and an ECG trace (PulseLine) behind the panel.
 *
 * The right side always carries a visual made from the page's own numbers
 * (`visual`: HeroBars, HeroFacts), so the decoration never stands in for
 * content. The H1 is the LCP element and is never animated in. Words come from
 * the admin through lib/pageCopy.ts. Server component.
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
    <section className="relative isolate overflow-hidden bg-[#020814]">
      {/* ---- light: two glows and a grid, on every hero ---- */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-cyan-500/25 blur-[110px]" />
        <div className="absolute -bottom-56 right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-teal-400/20 blur-[110px]" />
        <div className="absolute left-1/3 top-1/4 h-64 w-64 rounded-full bg-sky-400/10 blur-[90px]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_75%_75%_at_65%_35%,#000,transparent)]" />
      </div>

      {image ? (
        // ---- split: the photograph on the right, fading into the navy ----
        <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[58%] lg:block" aria-hidden="true">
          <Image
            src={image.url}
            alt=""
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover [mask-image:linear-gradient(to_right,transparent,#000_38%)]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020814] via-[#020814]/55 to-[#020814]/10" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#020814] to-transparent" />
        </div>
      ) : (
        // ---- composed: a large line-drawn mark ----
        <Mark
          className="pointer-events-none absolute -right-16 top-1/2 -z-10 hidden h-[30rem] w-[30rem] -translate-y-1/2 text-cyan-200/[0.07] lg:block"
          strokeWidth={0.6}
          aria-hidden="true"
        />
      )}
      <PulseLine className="absolute inset-x-0 bottom-6 -z-10 h-16 w-full opacity-70" />

      {image && (
        // A phone gets the photograph as a band above the words.
        <div className="relative h-40 w-full lg:hidden">
          <Image src={image.url} alt={image.alt} fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020814]/20 via-[#020814]/40 to-[#020814]" />
        </div>
      )}

      <div
        className={`container-custom relative grid gap-9 pb-14 pt-9 md:pb-16 md:pt-12 ${
          visual ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:items-center lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]" : ""
        }`}
      >
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-slate-400">
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`}>
                {i > 0 && <span className="mx-2 text-slate-600" aria-hidden="true">/</span>}
                {c.href ? (
                  <Link href={c.href} className="hover:text-white">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-slate-200" aria-current="page">
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
          {eyebrow && (
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-gradient-to-r from-cyan-400/15 to-teal-400/10 px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-cyan-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]">
              <Mark className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading max-w-[24ch] text-[clamp(2.1rem,4.4vw,3.35rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-white [text-wrap:balance]">
            {title}
            {accent && (
              <>
                {" "}
                <span className="text-gradient-hero">{accent}</span>
              </>
            )}
          </h1>
          {subtitle && <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-slate-300 md:text-[16.5px]">{subtitle}</p>}
          {stats.length > 0 && (
            <dl className={`mt-8 grid max-w-3xl grid-cols-2 gap-3 ${stats.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              {stats.map((s) => (
                <div key={s.label} className="glass-hero relative min-w-0 overflow-hidden rounded-2xl px-4 py-3.5">
                  <span className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" aria-hidden="true" />
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">{s.label}</dt>
                  <dd className="tnum font-heading mt-1 text-[1.35rem] font-extrabold leading-tight text-white md:text-[1.6rem]">{s.value}</dd>
                  {/* Wraps rather than truncates: "college × course × cate…" on a phone told nobody anything. */}
                  {s.note && <dd className="mt-0.5 text-[11.5px] leading-snug text-slate-400">{s.note}</dd>}
                </div>
              ))}
            </dl>
          )}
          {(cta || telegram) && (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {cta && (
                <Link
                  href={cta.href}
                  className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-3 text-[15px] font-bold text-slate-950 shadow-[0_10px_30px_-8px_rgb(34_211_238/0.6)] transition-transform hover:-translate-y-0.5"
                >
                  <Search className="h-4 w-4" aria-hidden="true" /> {cta.label}
                </Link>
              )}
              {telegram && (
                <TelegramLink
                  placement={telegram}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-[15px] font-semibold text-slate-100 backdrop-blur transition-colors hover:border-white/30 hover:bg-white/[0.08]"
                  iconClassName="text-[#229ED9]"
                >
                  Updates on Telegram
                </TelegramLink>
              )}
            </div>
          )}
          {source && <p className="mt-5 max-w-[62ch] text-[12px] leading-relaxed text-slate-400">{source}</p>}
        </div>
        {visual && <div className="relative min-w-0">{visual}</div>}
      </div>

      {image && (image.attribution || image.subject) && (
        <PhotoCredit
          subject={image.subject}
          attribution={image.attribution}
          license={image.license}
          className="absolute bottom-2 right-3 z-10"
        />
      )}
    </section>
  );
}
