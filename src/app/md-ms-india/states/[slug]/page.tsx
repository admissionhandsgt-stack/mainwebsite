import { fitTitle, fitDescription, count } from "@/lib/seoTitle";
import { getStateAuthority } from "@/lib/stateAuthorities";
import StateAuthority from "@/components/states/StateAuthority";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { notFound } from "next/navigation";
import { getPgStatePage, getPgStates } from "@/lib/pgStateQueries";
import { getStipends } from "@/lib/cutoffHubQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import DataHero from "@/components/hero/DataHero";
import HeroFacts from "@/components/hero/HeroFacts";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { getStateSeatMatrix, MATRIX_LABEL } from "@/lib/pgSeatData";
import { getBranches } from "@/lib/branchQueries";

import SectionHead from "@/components/ui/SectionHead";
/** One state's PG picture. See lib/pgStateQueries.ts for what it will and will not state. */

type Props = { params: { slug: string } };
const SITE = "https://www.admissionhands.com";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const money = (v: number | null) => {
  if (v == null) return "—";
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};
const span = (a: number | null, b: number | null, f: (v: number | null) => string) =>
  a == null && b == null ? "—" : a === b || b == null ? f(a) : a == null ? f(b) : `${f(a)} – ${f(b)}`;
const OWN: Record<string, string> = { government: "Government", private: "Private", deemed: "Deemed", other: "Other" };
const OWN_SHORT: Record<string, string> = { government: "Govt", private: "Private", deemed: "Deemed", other: "Other" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [p, stipends] = await Promise.all([getPgStatePage(params.slug), getStipends()]);
  if (!p) return { title: "State not found", robots: { index: false } };
  // Searched as "neet pg cut off branch wise maharashtra", "md fees in
  // maharashtra", "pg medical colleges in maharashtra", "md ms stipend in …".
  const y = p.year ? ` ${p.year}` : "";
  const govt = p.ownership.government ?? 0;
  const pvt = (p.ownership.private ?? 0) + (p.ownership.deemed ?? 0);
  const split = govt || pvt ? ` (${govt} government, ${pvt} private or deemed)` : "";
  const st = stipends.states.find((x) => x.state === p.name);
  const stipend = st ? `, stipend (median ₹${st.median.toLocaleString("en-IN")} a month)` : ", stipend";
  return resolveMetadata(`/md-ms-india/states/${p.slug}`, {
    title: fitTitle(
      `NEET PG Cutoff ${p.name}${y}: Branch Wise, Fees & ${count(p.colleges.length, "College", "Colleges")}`,
      `${p.name} NEET PG Cutoff${y} Branch Wise & Fees`,
      `MD/MS in ${p.name}: NEET PG Cutoff & Fees`,
      `PG Seats in ${p.name}`,
    ),
    description: fitDescription(
      `${count(p.colleges.length, "PG medical college", "PG medical colleges")} in ${p.name}${split}: NEET PG${y} closing ranks branch wise and by quota, fees${stipend}, and the counselling for each seat.`,
      `${count(p.colleges.length, "PG medical college", "PG medical colleges")} in ${p.name}: NEET PG${y} closing ranks branch wise and by quota, fees${stipend}.`,
      `${p.colleges.length} PG medical colleges in ${p.name} — NEET PG closing ranks and fees by quota, counsellings, branches and stipend.`,
    ),
    keywords: `PG seats in ${p.name}, NEET PG cutoff ${p.name}, MD MS colleges in ${p.name}, ${p.name} PG counselling, ${p.name} NEET PG fees`,
  });
}

/** A state's MCC seats, course by course: seat counts only, never a rank. */
function SeatsTable({
  list,
  hasBranch,
}: {
  list: { course: string; slug: string; total: number; aiq: number; deemed: number; dnb: number }[];
  hasBranch: Set<string>;
}) {
  const dash = (v: number) => (v ? n(v) : "–");
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="dt w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Course</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">AIQ</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Deemed</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">DNB</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">All MCC seats</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {list.map((c) => (
            <tr key={c.course}>
              <th scope="row" className="px-4 py-2.5 font-medium">
                {hasBranch.has(c.slug) ? (
                  <Link href={`/md-ms-india/branches/${c.slug}`} className="text-foreground hover:text-primary hover:underline">
                    {c.course}
                  </Link>
                ) : (
                  <span className="text-foreground">{c.course}</span>
                )}
              </th>
              <td className="tnum px-4 py-2.5 text-right">{dash(c.aiq)}</td>
              <td className="tnum px-4 py-2.5 text-right">{dash(c.deemed)}</td>
              <td className="tnum px-4 py-2.5 text-right">{dash(c.dnb)}</td>
              <td className="tnum px-4 py-2.5 text-right font-semibold">{n(c.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PgStatePage({ params }: Props) {
  const [p, stipends, all] = await Promise.all([getPgStatePage(params.slug), getStipends(), getPgStates()]);
  if (!p) notFound();
  const path = `/md-ms-india/states/${p.slug}`;
  const stipend = stipends.states.find((s) => s.state === p.name);
  const own = Object.entries(p.ownership).sort((a, b) => b[1] - a[1]);
  // The state's own government quota — the one most of its candidates are in. Not in-service,
  // sponsored, DNB, management, NRI or institutional seats, which close at different ranks
  // (Rajasthan's first match used to be "Rajasthan DNB Inservice Seat").
  const stateQuota = p.quotas
    .filter(
      (q) =>
        !/all india/i.test(q.counselling) &&
        !/^(AIQ|DNB|NBE|MNG|MM|AFMS|NRI)/i.test(q.quota) &&
        !/dnb|in-?service|sponsor|management|mgmt|mgt\b|nri|institut|private|paid|minority|esi/i.test(q.quota),
    )
    .sort((a, b) => Number(/state|govt|government|open|general/i.test(b.quota)) - Number(/state|govt|government|open|general/i.test(a.quota)) || b.colleges - a.colleges)[0];
  // Words from Admin → Content → Text & numbers ("Page: PG state pages"); photo from Admin → Media.
  const [copy, heroImage, authority, mcc, branchPages] = await Promise.all([
    pageCopy("page.pg_state.hero", { state: p.name, year: p.year ?? "the latest" }),
    pageHeroImage(`page.pg_state.${p.slug}.hero`, "page.pg_state.hero"),
    getStateAuthority(p.name),
    // MCC's 2026 seat matrix for the state — "md medicine seats in <state>" (lib/pgSeatData.ts).
    getStateSeatMatrix(p.name),
    getBranches(),
  ]);
  const MCC_SHOWN = 12;
  const mccCopy = await pageCopy("page.pg_state.mcc", {
    state: p.name,
    year: mcc?.year,
    total: mcc ? n(mcc.total) : undefined,
    count: mcc ? Math.max(0, mcc.courses.length - MCC_SHOWN) : 0,
    median: stipend ? `₹${stipend.median.toLocaleString("en-IN")}` : undefined,
  });
  const hasBranch = new Set(branchPages.map((b) => b.slug));

  const faqs = [
    {
      question: `How many PG medical colleges are there in ${p.name}?`,
      answer: `${p.colleges.length} colleges in ${p.name} have published NEET PG closing ranks: ${own.map(([k, v]) => `${v} ${OWN[k]?.toLowerCase() ?? k}`).join(", ")}.`,
    },
    {
      question: `Which counselling fills PG seats in ${p.name}?`,
      answer: `In the published results: ${p.counsellings.slice(0, 5).map((c) => `${c.name} (${c.colleges} colleges)`).join(", ")}. MCC fills the All India Quota, deemed and central seats; the state fills its own quota and its private colleges.`,
    },
    ...(stateQuota && p.year
      ? [
          {
            question: `What was the NEET PG ${p.year} cutoff for ${p.name} state quota?`,
            answer: `For ${stateQuota.quota}, open / general merit, seats closed from rank ${n(stateQuota.bestR1)} in round 1 to ${n(stateQuota.widest)} at the furthest, across ${stateQuota.colleges} colleges. Each college and branch closed somewhere in between — sign in to see your own chance at each.`,
          },
        ]
      : []),
    ...(stipend
      ? [
          {
            question: `What is the PG stipend in ${p.name}?`,
            answer: `The median first-year stipend among ${p.name}'s PG colleges that publish one is ₹${stipend.median.toLocaleString("en-IN")} a month${stipend.govtMedian ? ` (government ₹${stipend.govtMedian.toLocaleString("en-IN")})` : ""}${stipend.privateMedian ? `, private ₹${stipend.privateMedian.toLocaleString("en-IN")}` : ""}.`,
          },
        ]
      : []),
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "PG by state", path: "/md-ms-india/states" },
            { name: p.name, path },
          ]),
          webPage({ name: `MD/MS in ${p.name}`, description: `PG medical colleges, cutoffs and fees in ${p.name}.`, path }),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `PG medical colleges in ${p.name}`,
            numberOfItems: p.colleges.length,
            itemListElement: p.colleges.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.name,
              url: `${SITE}/md-ms-india/colleges/${c.slug}`,
            })),
          },
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "PG by state", href: "/md-ms-india/states" }, { label: p.name }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "PG colleges", value: n(p.colleges.length) },
          ...own.slice(0, 2).map(([k, v]) => ({ label: OWN[k] ?? k, value: n(v) })),
          { label: "Stipend / month", value: stipend ? `₹${stipend.median.toLocaleString("en-IN")}` : "—", note: stipend ? "median, first year" : undefined },
        ]}
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_state"
        source={copy.source}
        image={heroImage}
        topic="map"
        visual={
          <HeroFacts
            title={`${p.name} at a glance`}
            facts={[
              ...own.map(([k, v]) => ({ label: `${OWN_SHORT[k] ?? k} colleges`, value: n(v) })),
              ...(stipend?.govtMedian ? [{ label: "Govt stipend", value: `₹${stipend.govtMedian.toLocaleString("en-IN")}`, sub: "median a month, year 1" }] : []),
              ...(stipend?.privateMedian ? [{ label: "Private stipend", value: `₹${stipend.privateMedian.toLocaleString("en-IN")}`, sub: "median a month, year 1" }] : []),
              ...(stateQuota && p.year
                ? [{ label: `${stateQuota.quota.slice(0, 28)}, ${p.year}`, value: `${n(stateQuota.bestR1)} – ${n(stateQuota.widest)}`, sub: "open merit, round 1 close to furthest", wide: true }]
                : []),
              {
                label: "Counsellings",
                value: p.counsellings.slice(0, 2).map((c) => c.name.replace(/\s*\(.*\)\s*$/, "")).join(" · ") || "—",
                sub: `${p.counsellings.length > 2 ? `+${p.counsellings.length - 2} more · ` : ""}${p.branches.length} branches offered`,
                wide: true,
              },
            ]}
            footnote={`From ${p.year ?? "the latest"} published counselling results and each college's published stipend.`}
          />
        }
      />

      {/* -------------------- the state's counselling authority -------------------- */}
      {authority?.scope === "UG and PG" && (
        <div className="container-custom pt-10 md:pt-14">
          <StateAuthority a={authority} state={p.name} level="pg" />
        </div>
      )}

      {/* -------------------- MCC's seats in the state, 2026 -------------------- */}
      {mcc && (
        <section className="container-custom pt-10 md:pt-14">
          <SectionHead icon="list" eyebrow={`MCC · ${mcc.year}`} title={mccCopy.title} intro={mccCopy.intro} />
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Seats by seat matrix">
            {mcc.byMatrix.map((m) => (
              <li key={m.seatMatrix} className="inline-flex items-baseline gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] text-muted-foreground">
                {MATRIX_LABEL[m.seatMatrix] ?? m.seatMatrix}
                <b className="tnum text-[14px] text-foreground">{n(m.seats)}</b>
              </li>
            ))}
          </ul>
          {[mcc.courses.slice(0, MCC_SHOWN), mcc.courses.slice(MCC_SHOWN)].map((list, part) =>
            list.length === 0 ? null : (
              <div key={part} className={part === 0 ? "" : "mt-0"}>
                {part === 1 ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer list-none rounded-xl border border-border bg-card px-4 py-3 text-[14px] font-semibold text-primary-strong hover:border-primary/40 dark:text-primary">
                      {mccCopy.more}
                    </summary>
                    <SeatsTable list={list} hasBranch={hasBranch} />
                  </details>
                ) : (
                  <SeatsTable list={list} hasBranch={hasBranch} />
                )}
              </div>
            ),
          )}
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{mccCopy.source}</p>
          {stipend && (
            <Link
              href={`/md-ms-india/stipend/${p.slug}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-[14px] font-semibold text-primary-strong hover:border-primary/40 dark:text-primary"
            >
              {mccCopy.stipend_link} →
            </Link>
          )}
        </section>
      )}

      {p.quotas.length > 0 && (
        <section className="container-custom py-10 md:py-14">
          <SectionHead
            icon="chart"
            title={<>NEET PG {p.year} cutoff in {p.name}, by quota</>}
            intro={<>Open / general merit, in each counselling&apos;s own category code. The rank range and the fee range are separate: each is the lowest and highest across the quota&apos;s colleges, so the cheapest fee is not the seat with the furthest rank.</>}
          />
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Quota</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Round 1 close</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Last admitted</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Fee a year, range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {p.quotas.map((q) => (
                  <tr key={q.quota}>
                    <th scope="row" className="px-4 py-3 font-medium text-foreground">
                      {q.quota}
                      <span className="block text-[12px] font-normal text-muted-foreground">{q.counselling}</span>
                    </th>
                    <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(q.colleges)}</td>
                    <td className="tnum px-4 py-3 text-right">{n(q.bestR1)}</td>
                    <td className="tnum px-4 py-3 text-right font-semibold">{n(q.widest)}</td>
                    <td className="tnum px-4 py-3 text-right text-muted-foreground">{span(q.feeFrom, q.feeTo, money)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Which college closed where is on each college&apos;s own page.{" "}
            <Link href="/neet-pg-cutoff" className="font-semibold text-primary-strong hover:underline">All-India cutoff, branch wise →</Link>
          </p>
        </section>
      )}

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <SectionHead
            icon="branch"
            title={<>PG branches in {p.name}</>}
          />
          <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {p.branches.map((b) => (
              <li key={b.name}>
                <Link
                  href={`/md-ms-india/branches/${b.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary"
                >
                  <span className="font-medium text-foreground">{b.name}</span>
                  <span className="tnum shrink-0 text-[12px] text-muted-foreground">{b.colleges} colleges</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <SectionHead
          icon="college"
          title={<>PG medical colleges in {p.name}</>}
        />
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {p.colleges.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/md-ms-india/colleges/${c.slug}`}
                className="flex h-full flex-col rounded-xl border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary"
              >
                <span className="font-medium text-foreground">{c.name}</span>
                <span className="text-[12px] text-muted-foreground">{OWN[c.ownership] ?? c.ownership}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <SectionHead
            icon="help"
            title={<>MD/MS in {p.name}: common questions</>}
          />
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
                <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <LeadCapture
        level="pg"
        source={`PG in ${p.name}`}
        title={`Planning MD/MS in ${p.name}?`}
        body="A counsellor orders your branch and college choices across the state quota, AIQ and deemed rounds, against the published closing ranks and your budget."
      />
      <TelegramJoin placement="pg_state" />

      <section className="container-custom border-t border-border py-10">
        <h2 className="font-heading text-xl font-bold text-foreground">PG in other states</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {all
            .filter((s) => s.slug !== p.slug)
            .map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/md-ms-india/states/${s.slug}`}
                  className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {s.name}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
