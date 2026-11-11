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
import { hinglishFaqs } from "@/lib/hinglishFaq";

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
        "Yes, by law, when the DNB was trained in a medical institution with an attached hospital or in a hospital of 500 or more beds: section 37(2) of the National Medical Commission Act, 2019 makes it “equivalent in all respects” to the corresponding MD/MS. A DNB from a smaller hospital is still a recognised qualification, but needs one more year of senior residency in a medical college to count for teaching (NMC's faculty regulations, 2025, regulation 7).",
    },
    {
      question: "DNB kya hota hai?",
      answer:
        "DNB (Diplomate of National Board) NBEMS ki PG qualification hai — accredited hospitals mein training aur NBEMS ka exit exam. NMC Act 2019 ke section 37(2) ke hisaab se medical college wale hospital ya 500+ bed hospital ka DNB MD/MS ke barabar hai; chhote hospital ke DNB ko teaching ke liye ek saal senior residency aur chahiye.",
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

  faqs.push(
    ...(await hinglishFaqs("md_vs_dnb", {
      year,
      round,
      compared: d.compared || undefined,
      deeper: d.compared ? d.deeper : undefined,
      mdms_seats: d.mdmsSeats ? inr(d.mdmsSeats) : undefined,
      dnb_seats: d.dnbSeats ? inr(d.dnbSeats) : undefined,
      dnb_y1: dnb?.y1 ? money(dnb.y1.median) : undefined,
    })),
  );
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
        {/* "is dnb equivalent to md", "is dnb equal to md", "dnb kya hota hai" (2026-11-12, the journey study): answered in
            the law's own words, cited — the earlier answer only pointed at NMC's rules. */}
        <section id="is-dnb-equal-to-md" aria-labelledby="dnb-equal" className="scroll-mt-28 rounded-2xl border border-primary/25 bg-card p-5 md:p-7">
          <h2 id="dnb-equal" className="font-heading text-2xl font-bold text-foreground">Is DNB equal to MD? What the law says</h2>
          <p className="mt-3 max-w-[78ch] text-[15.5px] leading-relaxed text-foreground">
            <b>Yes — when the DNB was trained in a medical institution with an attached hospital, or in a hospital of 500 or more beds.</b> The
            National Medical Commission Act makes it equivalent in all respects to the MD/MS (and a DrNB to the DM/M.Ch.). A DNB from a smaller
            hospital is still a recognised qualification; to count for teaching it needs one more year of senior residency in a medical college.
          </p>
          <blockquote className="mt-5 border-l-4 border-primary bg-surface-1 px-4 py-3 text-[14.5px] leading-relaxed text-foreground">
            “The Diplomate of National Board in broad-speciality qualifications and super-speciality qualifications when granted in a medical
            institution with attached hospital or in a hospital with the strength of five hundred or more beds, by the National Board of
            Examinations, shall be equivalent in all respects to the corresponding postgraduate qualification and the super-speciality
            qualification granted under this Act, but in all other cases, senior residency in a medical college for an additional period of one
            year shall be required for such qualification to be equivalent for the purposes of teaching also.”
            <footer className="mt-2 text-[13px] text-muted-foreground">
              —{" "}
              <a href="https://egazette.gov.in/WriteReadData/2019/210357.pdf" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-primary">
                The National Medical Commission Act, 2019, section 37(2)
              </a>{" "}
              (Gazette of India, 8 Aug 2019)
            </footer>
          </blockquote>
          <ul className="mt-5 grid gap-3 md:grid-cols-3">
            <li className="rounded-xl bg-surface-1 p-4 text-[14px] leading-relaxed text-foreground">
              <b className="block text-[12px] uppercase tracking-[0.12em] text-primary-strong dark:text-primary">For teaching</b>
              NMC&apos;s faculty regulations of 30 June 2025 (regulation 7) repeat it: a DNB from a hospital under 500 beds needs an extra year of
              senior residency in a recognised medical institution in the same speciality.{" "}
              <a href="https://egazette.gov.in/WriteReadData/2025/264399.pdf" target="_blank" rel="noopener" className="font-semibold text-primary-strong hover:underline dark:text-primary">
                Gazette
              </a>
            </li>
            <li className="rounded-xl bg-surface-1 p-4 text-[14px] leading-relaxed text-foreground">
              <b className="block text-[12px] uppercase tracking-[0.12em] text-primary-strong dark:text-primary">Recognised</b>
              Every qualification the National Board grants is a recognised medical qualification under the Act&apos;s Schedule; NBEMS&apos;s
              gazette notification of 14 Nov 2022 lists each DNB and DrNB with the date it is recognised from.
            </li>
            <li className="rounded-xl bg-surface-1 p-4 text-[14px] leading-relaxed text-foreground">
              <b className="block text-[12px] uppercase tracking-[0.12em] text-signal-borderline">Not the same</b>
              FNB (fellowship) qualifications are not treated as recognised qualifications for teaching, per the same NBEMS notification. Ask a
              DNB hospital its bed strength before you choose it if you want to teach.
            </li>
          </ul>
        </section>

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
