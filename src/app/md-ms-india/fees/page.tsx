import type { Metadata } from "next";
import { Info } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { getFeeStates } from "@/lib/pgFeeMatrix";
import { exactInr } from "@/lib/chance";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import SectionHead from "@/components/ui/SectionHead";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import ExpertPlaybook from "@/components/lead/ExpertPlaybook";

/**
 * NEET PG fees, the whole country (2026-11-09): "neet pg fees", "md ms fees in india", "pg fees in private medical
 * colleges", "deemed university pg fees", "neet pg fee structure 2026". One row per state, linking each state's
 * college-by-college fee matrix (lib/pgFeeMatrix.ts). This URL 308'd to the college list from 2026-09-25 to
 * 2026-11-09, when it held a single net-cost figure.
 */

const FEE_YEAR = "2026-27";
const lakh = (v: number | null | undefined) => {
  if (v == null) return "—";
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  if (v >= 1e7) return `₹${trim(v / 1e7)} Cr`;
  if (v >= 1e5) return `₹${trim(v / 1e5)} L`;
  return exactInr(v);
};

export async function generateMetadata(): Promise<Metadata> {
  const { national: n, states } = await getFeeStates();
  return resolveMetadata("/md-ms-india/fees", {
    title: fitTitle(
      "NEET PG Fees 2026-27: MD/MS Fees in Govt, Private & Deemed Colleges",
      "NEET PG Fees 2026-27: MD/MS Fee Structure, State Wise",
      "NEET PG Fees 2026-27, State Wise",
    ),
    description: fitDescription(
      `MD/MS fees at ${n.colleges} colleges in ${states.length} states: government ${lakh(n.govtState)} a year, private management ${lakh(
        n.privateManagement,
      )}, deemed ${lakh(n.deemedPaid)} (middle figures). Every college, quota by quota.`,
      `MD/MS fees at ${n.colleges} colleges in ${states.length} states, government, private and deemed, college by college.`,
    ),
    keywords:
      "NEET PG fees, MD MS fees in India, PG fees in private medical colleges, PG fees in government medical colleges, deemed university PG fees, NEET PG fee structure 2026, MD fees state wise",
  });
}

export default async function PgFeesPage() {
  const { states, national: n } = await getFeeStates();
  const tokens = {
    year: FEE_YEAR,
    colleges: n.colleges,
    states: states.length,
    official: n.official,
    govt_colleges: n.government,
    private_colleges: n.private,
    deemed_colleges: n.deemed,
    govt_median: lakh(n.govtState),
    private_state_median: lakh(n.privateState),
    private_mgmt_median: lakh(n.privateManagement),
    deemed_median: lakh(n.deemedPaid),
    nri_median: lakh(n.nri),
  };
  const [copy, body, heroImage] = await Promise.all([
    pageCopy("page.pg_fees.hero", tokens),
    pageCopy("page.pg_fees.body", tokens),
    pageHeroImage("page.pg_fees.hero", "page.pg_stipend.hero"),
  ]);
  const faqs = [
    ...(n.govtState ? [{ question: body.faq1_q, answer: body.faq1_a }] : []),
    ...(n.privateState && n.privateManagement ? [{ question: body.faq2_q, answer: body.faq2_a }] : []),
    ...(n.deemedPaid ? [{ question: body.faq3_q, answer: body.faq3_a }] : []),
    ...(n.nri ? [{ question: body.faq4_q, answer: body.faq4_a }] : []),
    { question: body.faq5_q, answer: body.faq5_a },
  ];
  const cheapestPrivate = [...states].filter((s) => s.privateManagement).sort((a, b) => a.privateManagement! - b.privateManagement!);

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "PG fees by state", path: "/md-ms-india/fees" },
          ]),
          webPage({ name: "NEET PG fees, state by state", description: copy.subtitle, path: "/md-ms-india/fees" }),
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "PG fees" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        image={heroImage}
        topic="money"
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_fees"
        source={copy.source}
        visual={
          <HeroBars
            title="Private management seat, middle fee a year"
            caption="Lowest first, states with 3+ private colleges"
            rows={cheapestPrivate.slice(0, 7).map((s) => ({
              label: s.state,
              value: s.privateManagement!,
              display: lakh(s.privateManagement),
              href: `/md-ms-india/fees/${s.slug}`,
            }))}
          />
        }
        insights={[
          { icon: "authority" as const, label: "Govt, state quota", value: lakh(n.govtState), note: `middle fee a year · ${n.government} govt colleges` },
          { icon: "college" as const, label: "Private, management", value: lakh(n.privateManagement), note: `state quota ${lakh(n.privateState)}` },
          { icon: "spark" as const, label: "Deemed, paid seat", value: lakh(n.deemedPaid), note: `${n.deemed} deemed universities` },
          { icon: "people" as const, label: `${FEE_YEAR} notices`, value: `${n.official} of ${n.colleges}`, note: "colleges with their own or the authority's notice" },
        ]}
      />

      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="map" eyebrow="State by state" title={body.table_title} intro={body.table_intro} />
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="dt w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">State</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Govt, state quota</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Private, state quota</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Private, management</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Deemed, paid</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">NRI</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">{FEE_YEAR} notices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {states.map((s) => (
                <tr key={s.slug}>
                  <th scope="row" className="px-4 py-2.5 font-medium">
                    <Link href={`/md-ms-india/fees/${s.slug}`} className="text-primary-strong hover:underline dark:text-primary">
                      {s.state} PG fees
                    </Link>
                  </th>
                  <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{s.colleges}</td>
                  <td className="tnum px-4 py-2.5 text-right">{lakh(s.govtState)}</td>
                  <td className="tnum px-4 py-2.5 text-right">{lakh(s.privateState)}</td>
                  <td className="tnum px-4 py-2.5 text-right">{lakh(s.privateManagement)}</td>
                  <td className="tnum px-4 py-2.5 text-right">{lakh(s.deemedPaid)}</td>
                  <td className="tnum px-4 py-2.5 text-right">{lakh(s.nri)}</td>
                  <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{s.official} of {s.colleges}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-[13.5px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Middle fee a year: one figure per college (the middle of its branches on that kind of seat), then the middle across
            the state&apos;s colleges. {copy.source}
          </span>
        </p>
      </section>

      <section className="container-custom pb-10 md:pb-14">
        <ExpertPlaybook bare kind="fees" placement="pg_fees" />
        <DataPageCounsel kind="cutoff" name="PG fees" placement="counsel_pg_fees" />
      </section>

      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="help" eyebrow="FAQ" title={body.faq_title} />
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Also:{" "}
          <Link href="/md-ms-india/private-college-fees" className="font-semibold text-primary-strong hover:underline">
            MD fees in private medical colleges
          </Link>{" "}
          ·{" "}
          <Link href="/md-ms-india/deemed-universities" className="font-semibold text-primary-strong hover:underline">
            Deemed university PG fees
          </Link>{" "}
          ·{" "}
          <Link href="/nri-quota/fees" className="font-semibold text-primary-strong hover:underline">
            NRI quota fees
          </Link>{" "}
          ·{" "}
          <Link href="/md-ms-india/stipend" className="font-semibold text-primary-strong hover:underline">
            PG stipend by state
          </Link>{" "}
          ·{" "}
          <Link href="/md-ms-india/bond" className="font-semibold text-primary-strong hover:underline">
            PG bond by state
          </Link>{" "}
          ·{" "}
          <Link href="/neet-pg-choice-filling" className="font-semibold text-primary-strong hover:underline">
            Choice filling, upgrade and free exit
          </Link>
        </p>
      </section>

      <LeadCapture level="pg" source="PG fees page" title={body.lead_title} body={body.lead_body} />
      <TelegramJoin placement="pg_fees" />
    </main>
  );
}
