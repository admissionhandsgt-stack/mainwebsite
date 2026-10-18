import CiteThis from "@/components/seo/CiteThis";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDeemedPg } from "@/lib/pgFeeQueries";
import { resolveMetadata } from "@/lib/content";
import FeeBandTable, { lakh } from "@/components/cutoffs/FeeBandTable";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";

/**
 * "Deemed university PG fee structure", "NEET PG deemed cutoff". Per-college
 * fees are free on every college page, so listing them here gives nothing away;
 * which branch closed at which rank stays behind the gate on each college.
 */

const PATH = "/md-ms-india/deemed-universities";

export async function generateMetadata(): Promise<Metadata> {
  const d = await getDeemedPg();
  return resolveMetadata(PATH, {
    title: `Deemed University MD/MS Fees & NEET PG Cutoff ${d.year ?? ""}`,
    description: `PG fee structure at ${d.colleges.length} deemed universities — management and NRI quota, college by college — and where deemed seats closed in NEET PG ${d.year ?? ""} counselling.`,
    keywords:
      "deemed university PG fees, deemed university MD fees, NEET PG deemed university cutoff, deemed university fee structure PG, deemed NRI quota PG fees",
  });
}

export default async function DeemedPgPage() {
  const d = await getDeemedPg();
  const mng = d.national.find((b) => b.family === "Management");
  const nri = d.national.find((b) => b.family === "NRI");
  // Words from Admin → Content → Text & numbers ("Page: Deemed universities PG"); photo from Admin → Media.
  const [copy, heroImage] = await Promise.all([
    pageCopy("page.deemed_pg.hero", { count: d.colleges.length, year: d.year ?? "" }),
    pageHeroImage("page.deemed_pg.hero"),
  ]);

  const faqs = [
    ...(mng
      ? [
          {
            question: "What is the MD/MS fee at a deemed university?",
            answer: `In ${d.year}, management-quota PG seats at deemed universities had a median fee of ${lakh(mng.median)} a year; most cost between ${lakh(mng.p10)} and ${lakh(mng.p90)}. Clinical branches cost more than non-clinical ones at the same university.`,
          },
        ]
      : []),
    ...(nri
      ? [
          {
            question: "What is the NRI quota fee at deemed universities?",
            answer: `NRI-quota PG seats at deemed universities had a median fee of ${lakh(nri.median)} a year in ${d.year}; most were between ${lakh(nri.p10)} and ${lakh(nri.p90)}.`,
          },
        ]
      : []),
    ...(d.mngRanks
      ? [
          {
            question: "What NEET PG rank is needed for a deemed university?",
            answer: `Deemed management seats are filled by MCC and open to every state. In ${d.year} they closed from rank ${d.mngRanks.bestR1?.toLocaleString("en-IN") ?? "—"} in round 1 to ${d.mngRanks.widest?.toLocaleString("en-IN") ?? "—"} at the furthest — for the right fee, a deemed seat stays open far down the list.`,
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
            { name: "Deemed universities", path: PATH },
          ]),
          webPage({ name: "Deemed university MD/MS fees", description: "PG fees and cutoffs at deemed universities.", path: PATH }),
          faqPage(faqs),
        ]}
      />
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "Deemed universities" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "Deemed universities", value: String(d.colleges.length) },
          ...(mng ? [{ label: "Management, median", value: lakh(mng.median), note: "a year" }] : []),
          ...(nri ? [{ label: "NRI, median", value: lakh(nri.median), note: "a year" }] : []),
          ...(d.mngRanks?.widest ? [{ label: `Last rank, ${d.year}`, value: d.mngRanks.widest.toLocaleString("en-IN"), note: "management, any round" }] : []),
        ]}
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_deemed_pg"
        source={copy.source}
        image={heroImage}
        topic="money"
        visual={
          <HeroBars
            title={copy.visual_title}
            caption="Median published fee a year, by quota"
            rows={d.national
              .filter((b) => b.median != null)
              .map((b) => ({
                label: b.family,
                value: b.median ?? 0,
                display: lakh(b.median),
                note: `${b.colleges} colleges · most ${lakh(b.p10)} – ${lakh(b.p90)}`,
              }))}
            footnote="Most seats: the middle 80% of published fees, the 10th to the 90th percentile."
          />
        }
      />

      <section className="container-custom py-10 md:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">Deemed PG fees by quota</h2>
        <p className="mt-2 max-w-[72ch] text-muted-foreground">&quot;Most seats&quot; is the middle 80% of published fees.</p>
        <div className="mt-5">
          <FeeBandTable bands={d.national} />
        </div>
      </section>

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">Every deemed university</h2>
          <p className="mt-2 max-w-[72ch] text-muted-foreground">
            Lowest median management fee first. The range is across the university&apos;s branches; open one for its fees and
            ranks branch by branch.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">University</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Branches</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Management, median</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Management, by branch</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">NRI, median</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.colleges.map((c) => (
                  <tr key={c.slug}>
                    <th scope="row" className="px-4 py-3 font-medium">
                      <Link href={`/md-ms-india/colleges/${c.slug}`} className="text-foreground hover:text-primary hover:underline">
                        {c.name}
                      </Link>
                      {c.state && <span className="block text-[12px] font-normal text-muted-foreground">{c.state}</span>}
                    </th>
                    <td className="tnum px-4 py-3 text-right text-muted-foreground">{c.branches}</td>
                    <td className="tnum px-4 py-3 text-right font-semibold">{lakh(c.mngMedian)}</td>
                    <td className="tnum px-4 py-3 text-right text-muted-foreground">
                      {c.mngLow == null ? "—" : c.mngLow === c.mngHigh ? lakh(c.mngLow) : `${lakh(c.mngLow)} – ${lakh(c.mngHigh)}`}
                    </td>
                    <td className="tnum px-4 py-3 text-right">{lakh(c.nriMedian)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">Common questions</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((q) => (
            <details key={q.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{q.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{q.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Also: <Link href="/md-ms-india/private-college-fees" className="font-semibold text-primary-strong hover:underline">private college PG fees</Link> ·{" "}
          <Link href="/nri-quota/fees" className="font-semibold text-primary-strong hover:underline">NRI quota fees</Link> ·{" "}
          <Link href="/mbbs-india/deemed-universities" className="font-semibold text-primary-strong hover:underline">deemed universities for MBBS</Link>
        </p>
      </section>

      <section className="container-custom pb-10">
        <CiteThis title={`Deemed university MD/MS fees ${d.year ?? ""}`} path="/md-ms-india/deemed-universities" source={"fees published with MCC's deemed counselling"} />
      </section>

      <LeadCapture
        level="pg"
        source="Deemed PG page"
        title="Considering a deemed seat?"
        body="Deemed rounds run on MCC's calendar with their own deposit and exit rules. A counsellor plans them beside your state and AIQ options so a deposit is never lost by accident."
      />
    </main>
  );
}
