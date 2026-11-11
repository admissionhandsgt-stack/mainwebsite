import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import Link from "@/components/ui/Link";
import { Ban, FileCheck2, Landmark, MessageCircle, ScrollText } from "lucide-react";
import { db } from "@/db/client";
import { getContactInfo, resolveMetadata } from "@/lib/content";
import { getDataStats, approxLakh, inr } from "@/lib/dataStats";
import { getLiveFigures } from "@/lib/liveFigures";
import { getSeatMatrixOverview } from "@/lib/pgSeatData";
import { getScoreTables } from "@/lib/scoreRank";
import { pageCopy } from "@/lib/pageCopy";
import { CONTACT_INFO } from "@/lib/constants";
import nirf from "@/data/nirfMedical2025.json";
import StructuredData, { breadcrumb, webPage } from "@/components/seo/StructuredData";
import ReviewedBy from "@/components/seo/ReviewedBy";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

/**
 * How we check our data (2026-11-11, the competitive review's E-E-A-T gap): where each kind of figure comes from, the
 * checks it passes, what the site never publishes, and how to report a figure that does not match its source. Linked
 * from the "Reviewed by" line on every data page. Sources and standards only — never how the pages are built or how
 * often anything is read (owner, 2026-10-21). Words: Admin → Content → "Page: how we check our data".
 *
 * Its own hero, not DataHero (owner, same day: "formatting… blank space… image relevant nhi hai"): no photograph — the
 * sources themselves, each with the figure we hold from it, fill the space beside the words. The sources section that
 * sat under the hero is that grid now, so nothing is said twice.
 */
const PATH = "/how-we-check-data";
const SITE = "https://www.admissionhands.com";

const pairs = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [a, ...b] = l.split("|");
      return { title: a.trim(), text: b.join("|").trim() };
    });
const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Fee rows that carry a 2026-27 notice of their own (fees.fee_source). */
const officialFees = unstable_cache(
  async () => {
    try {
      const r = (await db.execute(sql`SELECT count(*)::int AS n, count(DISTINCT institute_id)::int AS colleges FROM fees WHERE fee_source IS NOT NULL`)) as unknown as {
        n: number;
        colleges: number;
      }[];
      return r[0] ?? null;
    } catch {
      return null;
    }
  },
  ["method-official-fees-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata(PATH, {
    title: "How We Check Our NEET Counselling Data: Sources & Standards",
    description:
      "Where every cut off, seat count, fee and stipend on AdmissionHands comes from — MCC, NBEMS, NMC, state authorities and colleges' own notices — and the checks each figure passes.",
  });
}

export default async function HowWeCheckData() {
  const [stats, live, reviewer, contact, matrix, scores, fees] = await Promise.all([
    getDataStats(),
    getLiveFigures(),
    pageCopy("site.reviewer", {}),
    getContactInfo().catch(() => null),
    getSeatMatrixOverview().catch(() => null),
    getScoreTables("pg").catch(() => []),
    officialFees(),
  ]);
  const copy = await pageCopy("page.methodology", {
    nmc_colleges: live.nmc_colleges,
    ranks: approxLakh(stats.totalRanks),
    counsellings: inr(stats.counsellings),
    name: reviewer.name,
    role: reviewer.role,
  });
  const scoreYears = scores.map((t) => t.year).sort();

  // The figure we hold from each source, matched to the admin's lines by the source's name.
  const figureFor = (title: string): { value: string; label: string } | null => {
    if (/\bMCC\b|counselling committee/i.test(title))
      return matrix ? { value: inr(matrix.total), label: `PG seats in MCC's ${matrix.year} seat matrix` } : null;
    if (/NBEMS|national board/i.test(title))
      return scoreYears.length ? { value: scoreYears.join(" & "), label: "NEET PG results, score to rank" } : null;
    if (/\bNMC\b|medical commission/i.test(title)) return { value: live.nmc_colleges, label: "colleges on NMC's register" };
    if (/state/i.test(title)) return stats.counsellings ? { value: inr(stats.counsellings), label: `counsellings across ${stats.states} states and UTs` } : null;
    if (/college|universit/i.test(title))
      return fees?.n ? { value: inr(fees.n), label: `fees from 2026-27 notices, ${inr(fees.colleges)} colleges` } : null;
    if (/NIRF/i.test(title)) return { value: `Top ${nirf.rows.length}`, label: `NIRF ${nirf.year} Medical ranks` };
    return null;
  };
  const sources = pairs(copy.sources).map((s) => ({ ...s, figure: figureFor(s.title) }));
  const checks = pairs(copy.checks);
  const never = lines(copy.never);
  const wa = (contact?.whatsappNumber || CONTACT_INFO.whatsapp).replace(/\D/g, "");
  const email = contact?.email ?? null;

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "How we check our data", path: PATH },
          ]),
          {
            ...webPage({ name: "How we check our NEET counselling data", description: copy.subtitle, path: PATH }),
            "@type": "AboutPage",
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${SITE}/#organization`,
            name: "AdmissionHands",
            url: SITE,
            publishingPrinciples: `${SITE}${PATH}`,
            correctionsPolicy: `${SITE}${PATH}#corrections`,
          },
        ]}
      />

      {/* ---- Hero: the words, and beside them the sources with what we hold from each ---- */}
      <section className="relative isolate overflow-hidden border-b border-border bg-background">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/80 via-background to-background" />
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_55%_at_75%_10%,#000,transparent)]" />
        </div>
        {/* Laptop: the never-publish list fills the space under the words beside the taller source grid. Wide screen
            (2xl): words and sources side by side, the list a full-width strip under both. Measured 1366 and 2525px. */}
        <div className="container-custom grid gap-8 pb-10 pt-7 md:pt-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-x-12 xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1 lg:pt-2">
            <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-muted-foreground">
              <Link href="/" className="hover:text-foreground hover:underline">
                Home
              </Link>
              <span className="mx-2 text-border" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-foreground" aria-current="page">
                How we check our data
              </span>
            </nav>
            <p className="mb-4 flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-strong">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft ring-1 ring-primary/15">
                <ScrollText className="h-4 w-4" aria-hidden="true" />
              </span>
              {copy.eyebrow}
            </p>
            <h1 className="font-heading text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground [text-wrap:balance]">
              {copy.title} <span className="text-primary-strong">{copy.accent}</span>
            </h1>
            <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground md:text-[16.5px]">{copy.subtitle}</p>
            <ReviewedBy />
          </div>

          <section aria-labelledby="sources" className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 2xl:row-span-1">
            <h2 id="sources" className="font-heading flex items-center gap-2 text-[1.35rem] font-bold text-foreground">
              <Landmark className="h-5 w-5 text-primary" aria-hidden="true" /> {copy.sources_title}
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {sources.map((s) => (
                <div key={s.title} className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <dt className="text-[14.5px] font-bold leading-snug text-foreground">{s.title}</dt>
                  {s.figure && (
                    <dd className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
                      <span className="tnum font-heading text-[1.35rem] font-extrabold leading-tight text-primary-strong">{s.figure.value}</span>
                      <span className="text-[12.5px] font-semibold text-muted-foreground">{s.figure.label}</span>
                    </dd>
                  )}
                  <dd className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{s.text}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="never" className="min-w-0 rounded-2xl border border-border bg-card/80 p-5 lg:col-start-1 lg:row-start-2 2xl:col-span-2">
            <h2 id="never" className="font-heading flex items-center gap-2 text-xl font-bold text-foreground">
              <Ban className="h-5 w-5 text-primary" aria-hidden="true" /> {copy.never_title}
            </h2>
            <ul className="mt-3 space-y-2 2xl:columns-2 2xl:gap-x-10 2xl:[&>li]:break-inside-avoid">
              {never.map((n) => (
                <li key={n} className="flex gap-2 text-[14px] leading-relaxed text-muted-foreground">
                  <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <div className="container-custom space-y-10 py-10 md:py-12">
        <section aria-labelledby="checks">
          <h2 id="checks" className="font-heading flex items-center gap-2 text-[1.5rem] font-bold text-foreground">
            <FileCheck2 className="h-6 w-6 text-primary" aria-hidden="true" /> {copy.checks_title}
          </h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {checks.map((c, i) => (
              <li key={c.title} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                <span className="tnum inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary-strong dark:text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold leading-snug text-foreground">{c.title}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{c.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>



          <section id="corrections" aria-labelledby="fix" className="scroll-mt-28 rounded-2xl border border-primary/25 bg-primary-soft/40 p-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-10">
          <div className="min-w-0">
            <h2 id="fix" className="font-heading flex items-center gap-2 text-xl font-bold text-foreground">
              <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" /> {copy.fix_title}
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{copy.fix}</p>
          </div>
          <div className="min-w-0 lg:self-center">
            <div className="mt-4 flex flex-wrap gap-2 lg:mt-0">
              <a
                href={`https://wa.me/${wa}?text=${encodeURIComponent("Hi, a figure on your site does not match the notice: ")}`}
                target="_blank"
                rel="noopener"
                data-placement="method_fix"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-[14.5px] font-bold text-accent-foreground hover:bg-accent/90"
              >
                <WhatsAppIcon size={17} aria-hidden="true" /> WhatsApp
              </a>
              {email && (
                <a href={`mailto:${email}`} className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-[14.5px] font-semibold text-foreground hover:border-primary/40">
                  {email}
                </a>
              )}
            </div>
            <p className="mt-4 border-t border-primary/15 pt-3 text-[13.5px] text-muted-foreground">
              {copy.reviewer}{" "}
              {reviewer.link?.startsWith("/") && (
                <Link href={reviewer.link} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                  Meet the team
                </Link>
              )}
              {copy.reviewer ? " · " : ""}
              The tables themselves, free to download and cite:{" "}
              <Link href="/data" className="font-semibold text-primary-strong hover:underline dark:text-primary">
                open data
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
