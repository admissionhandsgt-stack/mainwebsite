import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { BadgeCheck, Ban, FileCheck2, Landmark, MessageCircle } from "lucide-react";
import { getContactInfo, resolveMetadata } from "@/lib/content";
import { getDataStats, approxLakh, inr } from "@/lib/dataStats";
import { getLiveFigures } from "@/lib/liveFigures";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { CONTACT_INFO } from "@/lib/constants";
import StructuredData, { breadcrumb, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

/**
 * How we check our data (2026-11-11, the competitive review's E-E-A-T gap): where each kind of figure comes from, the
 * checks it passes, what the site never publishes, and how to report a figure that does not match its source. Linked
 * from the "Reviewed by" line on every data page. Sources and standards only — never how the pages are built or how
 * often anything is read (owner, 2026-10-21). Words: Admin → Content → "Page: how we check our data".
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

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata(PATH, {
    title: "How We Check Our NEET Counselling Data: Sources & Standards",
    description:
      "Where every cut off, seat count, fee and stipend on AdmissionHands comes from — MCC, NBEMS, NMC, state authorities and colleges' own notices — and the checks each figure passes.",
  });
}

export default async function HowWeCheckData() {
  const [stats, live, reviewer, contact] = await Promise.all([
    getDataStats(),
    getLiveFigures(),
    pageCopy("site.reviewer", {}),
    getContactInfo().catch(() => null),
  ]);
  const [copy, image] = await Promise.all([
    pageCopy("page.methodology", {
      nmc_colleges: live.nmc_colleges,
      ranks: approxLakh(stats.totalRanks),
      counsellings: inr(stats.counsellings),
      name: reviewer.name,
      role: reviewer.role,
    }),
    pageHeroImage("page.methodology.hero", "page.open_data.hero"),
  ]);
  const sources = pairs(copy.sources);
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

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "How we check our data" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "Closing-rank records", value: approxLakh(stats.totalRanks) },
          { label: "Counsellings", value: inr(stats.counsellings) },
          { label: "Colleges on NMC's register", value: live.nmc_colleges },
        ]}
        image={image}
        topic="document"
      />

      <div className="container-custom space-y-12 py-10 md:py-14">
        <section aria-labelledby="sources">
          <h2 id="sources" className="font-heading flex items-center gap-2 text-2xl font-bold text-foreground">
            <Landmark className="h-6 w-6 text-primary" aria-hidden="true" /> {copy.sources_title}
          </h2>
          <dl className="mt-5 grid gap-3 md:grid-cols-2">
            {sources.map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-card p-4">
                <dt className="font-semibold text-foreground">{s.title}</dt>
                <dd className="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">{s.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="checks">
          <h2 id="checks" className="font-heading flex items-center gap-2 text-2xl font-bold text-foreground">
            <FileCheck2 className="h-6 w-6 text-primary" aria-hidden="true" /> {copy.checks_title}
          </h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-2">
            {checks.map((c, i) => (
              <li key={c.title} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                <span className="tnum inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary-strong dark:text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{c.title}</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">{c.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="never" className="rounded-2xl border border-border bg-surface-2 p-5">
            <h2 id="never" className="font-heading flex items-center gap-2 text-xl font-bold text-foreground">
              <Ban className="h-5 w-5 text-primary" aria-hidden="true" /> {copy.never_title}
            </h2>
            <ul className="mt-3 space-y-2">
              {never.map((n) => (
                <li key={n} className="text-[14.5px] leading-relaxed text-muted-foreground">
                  — {n}
                </li>
              ))}
            </ul>
          </section>

          <section id="corrections" aria-labelledby="fix" className="scroll-mt-28 rounded-2xl border border-primary/25 bg-primary-soft/40 p-5">
            <h2 id="fix" className="font-heading flex items-center gap-2 text-xl font-bold text-foreground">
              <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" /> {copy.fix_title}
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">{copy.fix}</p>
            <div className="mt-4 flex flex-wrap gap-2">
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
          </section>
        </div>

        {copy.reviewer && (
          <p className="flex items-start gap-2 text-[14.5px] text-muted-foreground">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              {copy.reviewer}{" "}
              {reviewer.link?.startsWith("/") && (
                <Link href={reviewer.link} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                  {reviewer.name}
                </Link>
              )}
            </span>
          </p>
        )}

        <p className="text-[14px] text-muted-foreground">
          The tables themselves, free to download and cite:{" "}
          <Link href="/data" className="font-semibold text-primary-strong hover:underline dark:text-primary">
            open data
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
