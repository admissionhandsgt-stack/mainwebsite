import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { fitTitle, fitDescription, count } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { getBranchState, getBranchStateCombos, SEARCH_NAME } from "@/lib/branchStateQueries";
import { getStateSeatMatrix, getBondByState } from "@/lib/pgSeatData";
import { getStipends } from "@/lib/cutoffHubQueries";
import { getScoreTables } from "@/lib/scoreRank";
import { roundPath } from "@/lib/mccResults";
import { CUT_CATS } from "@/lib/mccRoundTypes";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { branchImage } from "@/lib/branchImage";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroFacts from "@/components/hero/HeroFacts";
import SectionHead from "@/components/ui/SectionHead";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramRoundAlert from "@/components/engage/TelegramRoundAlert";

/**
 * One PG branch in one state — "MD Radiology cutoff Rajasthan" (2026-10-26). What it states and what it
 * will not is in lib/branchStateQueries.ts: ranks only over three or more colleges, fees as a median and
 * the middle 80%, colleges by name without a rank.
 */

type Props = { params: { slug: string; state: string } };
const SITE = "https://www.admissionhands.com";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const money = (v: number | null | undefined) => {
  if (v == null) return "—";
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};
const OWN: Record<string, string> = { government: "Government", private: "Private", deemed: "Deemed", other: "Other" };

/** The state's own government quota — the one most of its candidates are in (as on the PG state page). */
function mainStateQuota<T extends { quota: string; counselling: string; colleges: number; widest: number | null }>(qs: T[]) {
  return qs
    .filter(
      (q) =>
        q.widest != null &&
        !/all india/i.test(q.counselling) &&
        !/^(AIQ|DNB|NBE|MNG|MM|AFMS|NRI)/i.test(q.quota) &&
        !/dnb|in-?service|sponsor|management|mgmt|mgt\b|nri|institut|private|paid|minority|esi/i.test(q.quota),
    )
    .sort((a, b) => Number(/state|govt|government|open|general/i.test(b.quota)) - Number(/state|govt|government|open|general/i.test(a.quota)) || b.colleges - a.colleges)[0];
}

async function scoreFor(year: number | undefined) {
  if (!year) return { at: (_: number) => null as number | null, outOf: null as number | null };
  const t = (await getScoreTables("pg")).find((x) => x.year === year);
  return {
    at: (rank: number) => t?.rows.find((r) => r.rankMin <= rank && rank <= r.rankMax)?.score ?? null,
    outOf: t?.outOf ?? null,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getBranchState(params.slug, params.state);
  if (!p) return { title: "Not found", robots: { index: false } };
  const name = SEARCH_NAME[p.course] ?? p.course;
  const y = p.year ? ` ${p.year}` : "";
  const r = p.round;
  const open = r?.aiq.Open;
  const sq = mainStateQuota(p.quotas);
  return resolveMetadata(`/md-ms-india/branches/${p.courseSlug}/${p.stateSlug}`, {
    title: fitTitle(
      ...(r ? [`${name} Cutoff ${p.state} ${r.year} &${y}: Seats & Fees`, `${name} Cutoff ${p.state} ${r.year} &${y}`] : []),
      `${name} Cutoff ${p.state}${y}: Closing Rank, Seats & Fees`,
      `${name} Cutoff ${p.state}${y}`,
      `${name} in ${p.state}`,
    ),
    description: fitDescription(
      ...(open && r
        ? [
            `${name} in ${p.state}: ${count(p.colleges, "college", "colleges")}. NEET PG ${r.year} ${r.label.toLowerCase()} last Open AIQ seat: AIR ${n(open)}.${sq && p.year ? ` ${p.year} state quota to ${sq.stateRank ? "state rank" : "AIR"} ${n(sq.widest)}.` : ""} Fees by quota.`,
            `${name} in ${p.state}: ${count(p.colleges, "college", "colleges")}. NEET PG ${r.year} ${r.label.toLowerCase()} last Open AIQ seat: AIR ${n(open)}. Closing ranks, seats and fees by quota.`,
          ]
        : []),
      `${p.course} in ${p.state}: ${count(p.colleges, "college", "colleges")}.${open && r ? ` NEET PG ${r.year} ${r.label.toLowerCase()}: last Open AIQ seat AIR ${n(open)}.` : ""}${sq && p.year ? ` ${p.year} state quota closed at ${sq.stateRank ? "state rank" : "AIR"} ${n(sq.widest)}.` : ""} Seats and fees by quota.`,
      `${p.course} in ${p.state}: ${count(p.colleges, "college", "colleges")} — closing ranks by quota, MCC's latest round, seats and fees.`,
      `${name} in ${p.state}: colleges, closing ranks, seats and fees.`,
    ),
    keywords: `${name} cutoff ${p.state}, ${p.course} ${p.state}, ${name} seats in ${p.state}, ${name} fees ${p.state}, NEET PG ${p.state} ${name}`,
  });
}

export default async function BranchStatePage({ params }: Props) {
  const p = await getBranchState(params.slug, params.state);
  if (!p) notFound();
  const name = SEARCH_NAME[p.course] ?? p.course;
  const path = `/md-ms-india/branches/${p.courseSlug}/${p.stateSlug}`;
  const r = p.round;
  const tokens = {
    branch: p.course,
    name,
    state: p.state,
    count: p.colleges,
    year: p.year ?? "the latest",
  };
  const [copy, body, heroImage, combos, mcc, stipends, bonds, score] = await Promise.all([
    pageCopy("page.pg_branch_state.hero", tokens),
    pageCopy("page.pg_branch_state.body", { ...tokens, year: r?.year ?? tokens.year, round: r?.label, round_lc: r?.label.toLowerCase() }),
    pageHeroImage(`page.pg_branch.${p.courseSlug}.hero`).then((img) => img ?? branchImage(p.course)),
    getBranchStateCombos(),
    getStateSeatMatrix(p.state),
    getStipends(),
    getBondByState(),
    scoreFor(r?.year),
  ]);
  const quotaCopy = await pageCopy("page.pg_branch_state.body", tokens);
  const seats = mcc?.courses.find((c) => c.course === p.course) ?? null;
  const stipend = stipends.states.find((s) => s.state === p.state) ?? null;
  const bond = bonds?.states.find((s) => s.state === p.state) ?? null;
  const sq = mainStateQuota(p.quotas);
  const own = Object.entries(p.ownership).sort((a, b) => b[1] - a[1]);
  const otherStates = combos.filter((c) => c.course === p.course && c.stateSlug !== p.stateSlug);
  const otherBranches = combos.filter((c) => c.stateSlug === p.stateSlug && c.course !== p.course);
  const cats = r ? CUT_CATS.filter((c) => r.aiq[c] != null || r.deemed[c] != null) : [];
  const fees = p.quotas.filter((q) => q.feeMedian != null);

  const faqs = [
    {
      question: `What is the ${name} cutoff in ${p.state}?`,
      answer:
        [
          r?.aiq.Open
            ? `In MCC's NEET PG ${r.year} ${r.label.toLowerCase()} result, the last Open All India Quota seat in ${p.course} at ${p.state}'s colleges went to AIR ${n(r.aiq.Open)}${score.at(r.aiq.Open) != null ? ` (a score of about ${score.at(r.aiq.Open)}${score.outOf ? ` out of ${score.outOf}` : ""})` : ""}.`
            : null,
          sq && p.year
            ? `In ${p.year}, ${sq.quota} (${sq.counselling}) open merit seats closed from ${sq.stateRank ? "state rank" : "AIR"} ${n(sq.bestR1)} in round 1 to ${n(sq.widest)} at the furthest, across ${sq.colleges} colleges${sq.stateRank ? ` — ranks in ${p.state}'s own merit list, not All India Ranks` : ""}.`
            : null,
          "Each college and quota closed somewhere in that range — sign in to see your own chance at each.",
        ]
          .filter(Boolean)
          .join(" "),
    },
    {
      question: `How many ${name} seats are there in ${p.state}?`,
      answer:
        `${count(p.colleges, "college", "colleges")} in ${p.state} offer ${p.course}${own.length ? ` — ${own.map(([k, v]) => `${v} ${(OWN[k] ?? k).toLowerCase()}`).join(", ")}` : ""}.` +
        (seats
          ? ` In MCC's ${mcc!.year} counselling the state has ${[
              count(seats.aiq, "All India Quota seat", "All India Quota seats"),
              seats.deemed ? `${n(seats.deemed)} deemed university seats` : null,
              seats.dnb ? `${n(seats.dnb)} DNB seats` : null,
            ]
              .filter(Boolean)
              .join(", ")
              .replace(/, ([^,]*)$/, " and $1")} in the branch; the state quota's seats are filled by the state's own counselling.`
          : ""),
    },
    ...(fees.length
      ? [
          {
            question: `What is the fee for ${name} in ${p.state}?`,
            answer: `As the colleges publish it, by quota: ${fees
              .slice(0, 4)
              .map((q) => `${q.quota} — median ${money(q.feeMedian)} (middle 80% ${money(q.feeP10)} to ${money(q.feeP90)}, ${q.feeColleges} colleges)`)
              .join("; ")}. Confirm the fee, hostel and deposit with the college before you pay.`,
          },
        ]
      : []),
    {
      question: `Which colleges offer ${name} in ${p.state}?`,
      answer: `${p.collegeList
        .slice(0, 12)
        .map((c) => c.name)
        .join(", ")}${p.collegeList.length > 12 ? ` and ${p.collegeList.length - 12} more` : ""}.`,
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS branches", path: "/md-ms-india/branches" },
            { name: p.course, path: `/md-ms-india/branches/${p.courseSlug}` },
            { name: p.state, path },
          ]),
          webPage({ name: `${p.course} in ${p.state}`, description: `${p.course} colleges, closing ranks, seats and fees in ${p.state}.`, path }),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Colleges offering ${p.course} in ${p.state}`,
            numberOfItems: p.collegeList.length,
            itemListElement: p.collegeList.map((c, i) => ({
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
        crumbs={[
          { label: "Home", href: "/" },
          { label: "MD/MS branches", href: "/md-ms-india/branches" },
          { label: p.course, href: `/md-ms-india/branches/${p.courseSlug}` },
          { label: p.state },
        ]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "Colleges", value: n(p.colleges), note: `offering ${name}` },
          ...(seats ? [{ label: `AIQ seats, ${mcc!.year}`, value: n(seats.aiq), note: "MCC's seat matrix" }] : []),
          ...(r?.aiq.Open ? [{ label: `AIQ ${r.label}`, value: `AIR ${n(r.aiq.Open)}`, note: "last Open seat in the state" }] : []),
          { label: "Stipend / month", value: stipend ? `₹${stipend.median.toLocaleString("en-IN")}` : "—", note: stipend ? `median in ${p.state}` : undefined },
        ]}
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_branch_state"
        source={copy.source}
        image={heroImage}
        topic="branch"
        visual={
          <HeroFacts
            title={copy.visual_title}
            facts={[
              ...own.map(([k, v]) => ({ label: `${OWN[k] ?? k} colleges`, value: n(v), sub: p.course })),
              ...(sq && p.year
                ? [{ label: `${sq.quota.slice(0, 28)}, ${p.year}`, value: `${n(sq.bestR1)} – ${n(sq.widest)}`, sub: `open merit, ${sq.stateRank ? "state rank" : "AIR"}, round 1 close to furthest`, wide: true }]
                : []),
              ...(seats?.deemed ? [{ label: `Deemed seats, ${mcc!.year}`, value: n(seats.deemed), sub: "MCC's seat matrix" }] : []),
              ...(stipend?.govtMedian ? [{ label: "Govt stipend", value: `₹${stipend.govtMedian.toLocaleString("en-IN")}`, sub: "median a month, year 1" }] : []),
            ]}
            footnote={`From ${p.year ?? "the latest"} published counselling results, MCC's seat matrix and each college's published stipend.`}
          />
        }
      />

      {/* --------------------- the latest MCC round, in this state --------------------- */}
      {r && cats.length > 0 && (
        <section className="container-custom pt-10 md:pt-14">
          <SectionHead icon="chart" eyebrow={`MCC · ${r.year}`} title={body.round_title} intro={body.round_intro} />
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="dt w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">All India Quota</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">≈ Score{score.outOf ? ` / ${score.outOf}` : ""}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Deemed, paid seats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cats.map((c) => (
                  <tr key={c}>
                    <th scope="row" className="px-4 py-2.5 font-medium text-foreground">{c}</th>
                    <td className="tnum px-4 py-2.5 text-right font-semibold">{r.aiq[c] != null ? `AIR ${n(r.aiq[c])}` : "—"}</td>
                    <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{r.aiq[c] != null ? score.at(r.aiq[c]!) ?? "—" : "—"}</td>
                    <td className="tnum px-4 py-2.5 text-right">{r.deemed[c] != null ? `AIR ${n(r.deemed[c])}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">
            <Link href={roundPath(r.year, r.slug)} className="font-semibold text-primary-strong hover:underline">
              NEET PG {r.year} {r.label} result, every branch
            </Link>{" "}
            ·{" "}
            <Link href={`/md-ms-india/branches/${p.courseSlug}`} className="font-semibold text-primary-strong hover:underline">
              {p.course}, all of India
            </Link>{" "}
            ·{" "}
            <Link href="/neet-pg-marks-vs-rank" className="font-semibold text-primary-strong hover:underline">
              NEET PG marks vs rank
            </Link>
          </p>
        </section>
      )}

      {/* ------------------------- the state's own results, by quota ------------------------- */}
      {p.quotas.length > 0 && (
        <section className="container-custom py-10 md:py-14">
          <SectionHead icon="list" title={quotaCopy.quota_title} intro={quotaCopy.quota_intro} />
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="dt w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Quota</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Round 1 close</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Last admitted</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Published fee, median</th>
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
                    <td className="tnum px-4 py-3 text-right">
                      {n(q.bestR1)}
                      {q.stateRank && q.bestR1 != null && <span className="block text-[11px] text-muted-foreground">state rank</span>}
                    </td>
                    <td className="tnum px-4 py-3 text-right font-semibold">
                      {n(q.widest)}
                      {q.stateRank && q.widest != null && <span className="block text-[11px] font-normal text-muted-foreground">state rank</span>}
                    </td>
                    <td className="tnum px-4 py-3 text-right">
                      {money(q.feeMedian)}
                      {q.feeMedian != null && q.feeP10 != null && q.feeP90 != null && q.feeP10 !== q.feeP90 && (
                        <span className="block text-[12px] text-muted-foreground">
                          {money(q.feeP10)} – {money(q.feeP90)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            &ldquo;State rank&rdquo; is a place in the state&apos;s own merit list, which most state counsellings publish instead of the All
            India Rank — it is not comparable with an AIR. A dash means fewer than three colleges stand behind the figure, so it is not
            shown. Confirm the fee, hostel and deposit with the college before you pay.
          </p>
        </section>
      )}

      <section className="container-custom pb-10 md:pb-14">
        <DataPageCounsel kind="branch" name={`${name} in ${p.state}`} placement="counsel_branch_state" />
      </section>

      {/* ------------------------------ seats, stipend, bond ------------------------------ */}
      {(seats || stipend || bond?.govt.withBond) && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom grid gap-4 md:grid-cols-3">
            {seats && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-primary-strong">MCC · {mcc!.year}</p>
                <p className="mt-2 font-heading text-lg font-bold text-foreground">{n(seats.total)} seats in MCC&apos;s counselling</p>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                  All India Quota {n(seats.aiq)}
                  {seats.deemed ? ` · deemed ${n(seats.deemed)}` : ""}
                  {seats.dnb ? ` · DNB ${n(seats.dnb)}` : ""}. The state quota is filled by {p.state}&apos;s own counselling.
                </p>
              </div>
            )}
            {stipend && (
              <Link href={`/md-ms-india/stipend/${p.stateSlug}`} className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-primary-strong">Stipend</p>
                <p className="mt-2 font-heading text-lg font-bold text-foreground">₹{stipend.median.toLocaleString("en-IN")} a month, median</p>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                  First year, across {stipend.colleges} PG colleges in {p.state}
                  {stipend.govtMedian ? ` · government ₹${stipend.govtMedian.toLocaleString("en-IN")}` : ""} →
                </p>
              </Link>
            )}
            {bond && bond.govt.withBond > 0 && (
              <Link href={`/md-ms-india/bond#${bond.anchor}`} className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-primary-strong">Service bond</p>
                <p className="mt-2 font-heading text-lg font-bold text-foreground">
                  {bond.govt.typicalYears ? `${bond.govt.typicalYears}-year bond` : "A bond"} on government seats
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                  {bond.govt.withBond} of {bond.govt.colleges} government colleges
                  {bond.govt.penaltyMedian ? `, penalty median ${money(bond.govt.penaltyMedian)}` : ""} — as listed for the counselling, not an
                  official notice; confirm with the state&apos;s notice before you sign →
                </p>
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="college" title={body.colleges_title} intro={body.colleges_intro} />
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {p.collegeList.map((c) => (
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
          <SectionHead icon="help" title={body.faq_title} />
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

      <TelegramRoundAlert placement="round_alert_branch_state" className="pt-10 md:pt-14" />

      <LeadCapture level="pg" source={`${p.course} in ${p.state}`} title={body.lead_title} body={body.lead_body} />

      <section className="container-custom border-t border-border py-10">
        <h2 className="font-heading text-xl font-bold text-foreground">{body.other_states}</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {otherStates.map((c) => (
            <li key={c.stateSlug}>
              <Link
                href={`/md-ms-india/branches/${c.courseSlug}/${c.stateSlug}`}
                className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {c.state}
              </Link>
            </li>
          ))}
        </ul>
        {otherBranches.length > 0 && (
          <>
            <h2 className="mt-8 font-heading text-xl font-bold text-foreground">{body.other_branches}</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {otherBranches.map((c) => (
                <li key={c.courseSlug}>
                  <Link
                    href={`/md-ms-india/branches/${c.courseSlug}/${c.stateSlug}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {SEARCH_NAME[c.course] ?? c.course}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-6 text-[14px]">
          <Link href={`/md-ms-india/states/${p.stateSlug}`} className="font-semibold text-primary-strong hover:underline">
            Every PG branch in {p.state} →
          </Link>
        </p>
      </section>
    </main>
  );
}
