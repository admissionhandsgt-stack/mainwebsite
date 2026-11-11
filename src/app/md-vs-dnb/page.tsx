import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { resolveMetadata } from "@/lib/content";
import { getMdVsDnb } from "@/lib/mdVsDnb";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { fitTitle, fitDescription } from "@/lib/seoTitle";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroFacts from "@/components/hero/HeroFacts";
import CollegeFaq from "@/components/colleges/CollegeFaq";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import ExpertCompare from "@/components/lead/ExpertCompare";
import TelegramJoin from "@/components/engage/TelegramJoin";

/**
 * MD/MS vs DNB (2026-11-11): seats from MCC's matrix, the latest round's last rank per branch on each side (3+
 * colleges), stipend and fee as listed for the counselling (with its caveat), and how the two differ. Every figure from
 * lib/mdVsDnb.ts; words in Admin → Content → "Page: MD/MS vs DNB".
 */
export const revalidate = 3600;
const PATH = "/md-vs-dnb";
const inr = (n: number) => n.toLocaleString("en-IN");
const money = (v: number) => (v >= 100000 ? `₹${+(v / 100000).toFixed(2)} L` : `₹${inr(v)}`);

async function load() {
  const d = await getMdVsDnb();
  const year = d.round?.year ?? d.matrixYear;
  const round = d.round ? `NEET PG ${d.round.year} ${d.round.label}` : null;
  const copy = await pageCopy("page.md_vs_dnb", {
    year,
    round,
    mdms_seats: d.mdmsSeats ? inr(d.mdmsSeats) : undefined,
    dnb_seats: d.dnbSeats ? inr(d.dnbSeats) : undefined,
    dnb_hospitals: d.dnbHospitals ? inr(d.dnbHospitals) : undefined,
    deeper: d.compared ? d.deeper : undefined,
    compared: d.compared || undefined,
    session: d.terms.session,
  });
  return { d, year, round, copy };
}

export async function generateMetadata(): Promise<Metadata> {
  const { d, year } = await load();
  const y = year ? ` ${year}` : "";
  return resolveMetadata(PATH, {
    title: fitTitle(`MD vs DNB${y}: Seats, Cut Off, Stipend & Fees Compared`, `MD vs DNB${y}: Seats, Cut Off & Stipend`, `MD vs DNB${y}`),
    description: fitDescription(
      `MD/MS or DNB? ${d.mdmsSeats ? `${inr(d.mdmsSeats)} MD/MS and ${inr(d.dnbSeats)} DNB seats in MCC's${y} counselling` : "Seats in MCC's counselling"}, the last rank admitted branch by branch, stipend and fee — and how the two degrees differ.`,
      `MD vs DNB${y}: seats, branch-wise cut off, stipend and fees, from MCC's counselling.`,
    ),
    keywords: `md vs dnb, dnb vs md, is dnb equal to md, dnb stipend, dnb fees, dnb cut off ${year ?? ""}, md or dnb which is better`,
  });
}

export default async function MdVsDnb() {
  const { d, year, round, copy } = await load();
  const image = await pageHeroImage("page.md_vs_dnb.hero", "page.pg_branches.hero");
  const diff = copy.diff
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((x) => x.length >= 3 && x[0]);
  const { aiq, dnb } = d.terms;
  const withCut = d.pairs.filter((p) => p.mdLast != null || p.dnbLast != null);
  const answerReady = Boolean(copy.answer && d.compared);

  const faqs = [
    {
      question: "Is DNB equal to MD/MS?",
      answer:
        "Both are postgraduate qualifications in the same specialities, and both are allotted through the same NEET PG counselling. MD/MS is a university degree earned at an NMC-permitted medical college; DNB is awarded by NBEMS after training at an accredited hospital and an NBEMS exit exam. For a medical-college teaching post, NMC sets conditions for DNB holders — check its current teacher-eligibility rules if you aim to teach.",
    },
    ...(d.compared
      ? [
          {
            question: "Is a DNB seat easier to get than an MD/MS seat?",
            answer: `In ${round}, the last Open seat in DNB went further down the list than the All India Quota MD/MS one in ${d.deeper} of ${d.compared} branches where both had three or more colleges.${
              withCut[0]?.mdLast && withCut[0]?.dnbLast
                ? ` In ${withCut[0].branch}, for example, MD/MS AIQ closed at AIR ${inr(withCut[0].mdLast)} and DNB at AIR ${inr(withCut[0].dnbLast)}.`
                : ""
            } A later round usually goes further down on both sides.`,
          },
        ]
      : []),
    ...(d.mdmsSeats && d.dnbSeats
      ? [
          {
            question: `How many DNB seats are there in NEET PG ${year}?`,
            answer: `MCC's ${d.matrixYear} seat matrix has ${inr(d.dnbSeats)} DNB and NBE diploma seats${d.dnbHospitals ? ` at ${inr(d.dnbHospitals)} hospitals` : ""}, beside ${inr(d.mdmsSeats)} MD/MS seats in the All India Quota, deemed universities and central universities' internal quotas. States add their own government seats in their own rounds.`,
          },
        ]
      : []),
    ...(dnb?.y1
      ? [
          {
            question: "What is the DNB stipend?",
            answer: `As listed for the ${d.terms.session ?? "latest"} counselling, the middle DNB hospital pays ${money(dnb.y1.median)} a month in the first year; the middle 80% of hospitals pay ${money(dnb.y1.p10)} to ${money(dnb.y1.p90)}${
              aiq?.y1 ? `. All India Quota MD/MS seats list a median of ${money(aiq.y1.median)}` : ""
            }. Not an official notice — confirm with the hospital before you join.`,
          },
        ]
      : []),
    ...(dnb?.fee
      ? [
          {
            question: "What is the DNB fee?",
            answer: `As listed for the counselling, the middle DNB hospital charges ${money(dnb.fee.median)} a year; the middle 80% charge ${money(dnb.fee.p10)} to ${money(dnb.fee.p90)}. Confirm the fee and any bond with the hospital before you pay.`,
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
            { name: "MD vs DNB", path: PATH },
          ]),
          webPage({ name: `MD vs DNB ${year ?? ""}`, description: copy.subtitle, path: PATH }),
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "MD vs DNB" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={answerReady ? <><b className="text-foreground">{copy.answer}</b> {copy.subtitle}</> : copy.subtitle}
        stats={[
          ...(d.mdmsSeats ? [{ label: "MD/MS seats (MCC)", value: inr(d.mdmsSeats), note: `${d.matrixYear} seat matrix` }] : []),
          ...(d.dnbSeats ? [{ label: "DNB & NBE diploma", value: inr(d.dnbSeats), note: d.dnbHospitals ? `${inr(d.dnbHospitals)} hospitals` : undefined }] : []),
          ...(dnb?.y1 ? [{ label: "DNB stipend, year 1", value: `${money(dnb.y1.median)}/mo`, note: "median, as listed" }] : []),
        ]}
        cta={{ label: "Check your MD/MS and DNB chances", href: "/neet-college-predictor?course=pg" }}
        telegram="hero_md_vs_dnb"
        image={image}
        topic="branch"
        visual={
          aiq || dnb ? (
            <HeroFacts
              title={copy.money_title}
              facts={[
                ...(aiq?.y1 ? [{ label: "MD/MS AIQ stipend, year 1", value: `${money(aiq.y1.median)}/mo` }] : []),
                ...(dnb?.y1 ? [{ label: "DNB stipend, year 1", value: `${money(dnb.y1.median)}/mo` }] : []),
                ...(aiq?.fee ? [{ label: "MD/MS AIQ fee", value: `${money(aiq.fee.median)}/yr` }] : []),
                ...(dnb?.fee ? [{ label: "DNB fee", value: `${money(dnb.fee.median)}/yr` }] : []),
              ]}
              footnote={copy.money_note}
            />
          ) : undefined
        }
      />

      <div className="container-custom space-y-12 py-10 md:py-14">
        {withCut.length > 0 && round && (
          <section aria-labelledby="by-branch">
            <h2 id="by-branch" className="font-heading text-2xl font-bold text-foreground">
              {copy.table_title}
            </h2>
            <p className="mt-1 max-w-[80ch] text-[14px] text-muted-foreground">{copy.table_intro}</p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
              <table className="dt w-full min-w-[720px] text-[14px]">
                <thead>
                  <tr>
                    <th className="text-left">Branch</th>
                    <th className="text-right">MD/MS AIQ last rank</th>
                    <th className="text-right">DNB last rank</th>
                    <th className="text-right">MD/MS seats</th>
                    <th className="text-right">DNB seats</th>
                  </tr>
                </thead>
                <tbody>
                  {withCut.map((p) => (
                    <tr key={p.md}>
                      <td>
                        <Link href={`/md-ms-india/branches/${p.mdSlug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                          {p.branch}
                        </Link>
                        <span className="text-muted-foreground">
                          {" "}
                          ·{" "}
                          <Link href={`/md-ms-india/branches/${p.dnbSlug}`} className="hover:text-primary hover:underline">
                            DNB
                          </Link>
                        </span>
                      </td>
                      <td className="tnum text-right">
                        {p.mdLast ? (
                          <>
                            {inr(p.mdLast)}
                            {p.mdScore != null && <div className="text-[12px] text-muted-foreground">score {p.mdScore}</div>}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="tnum text-right">
                        {p.dnbLast ? (
                          <>
                            {inr(p.dnbLast)}
                            {p.dnbScore != null && <div className="text-[12px] text-muted-foreground">score {p.dnbScore}</div>}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="tnum text-right">{p.mdSeats ? inr(p.mdSeats) : "—"}</td>
                      <td className="tnum text-right">{p.dnbSeats ? inr(p.dnbSeats) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {d.outOf && <p className="mt-2 text-[12.5px] text-muted-foreground">Scores out of {d.outOf}, from NBEMS&apos;s NEET PG {year} result.</p>}
          </section>
        )}

        {diff.length > 0 && (
          <section aria-labelledby="differ">
            <h2 id="differ" className="font-heading text-2xl font-bold text-foreground">
              {copy.diff_title}
            </h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
              <table className="dt w-full min-w-[640px] text-[14px]">
                <thead>
                  <tr>
                    <th className="text-left" />
                    <th className="text-left">MD/MS</th>
                    <th className="text-left">DNB</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.map(([what, md, dn]) => (
                    <tr key={what}>
                      <th scope="row" className="text-left font-semibold text-foreground">
                        {what}
                      </th>
                      <td>{md}</td>
                      <td>{dn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <DataPageCounsel kind="branch" name={copy.counsel} placement="counsel_md_vs_dnb" />

        <CollegeFaq faqs={faqs.map((f) => ({ q: f.question, a: f.answer }))} />
      </div>

      <ExpertCompare placement="md_vs_dnb" />
      <TelegramJoin placement="md_vs_dnb" />
    </main>
  );
}
