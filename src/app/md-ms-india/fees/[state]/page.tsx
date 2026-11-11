import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { getStateFeeMatrix, FAMILY_LABEL, type MatrixCollege, type MatrixRow, type Ownership, type Seat } from "@/lib/pgFeeMatrix";
import { approxFee, exactInr } from "@/lib/chance";
import { getStateStipend } from "@/lib/cutoffHubQueries";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroFacts from "@/components/hero/HeroFacts";
import SectionHead from "@/components/ui/SectionHead";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import ExpertPlaybook from "@/components/lead/ExpertPlaybook";
import { hinglishFaqs } from "@/lib/hinglishFaq";
import { getCityIndex } from "@/lib/cityQueries";
import { cityIn } from "@/lib/cityKey";

/**
 * One state's NEET PG fee matrix (2026-11-09): "maharashtra pg fees", "karnataka md ms fees 2026", "pg fees in
 * private medical colleges in rajasthan", "<college> pg fees". Every MD/MS college in the state with a yearly fee,
 * a row per quota, the cheapest and dearest branch named — lib/pgFeeMatrix.ts says which fee and why.
 * Words: Admin → Content → "Page: NEET PG fees, one state".
 */

const FEE_YEAR = "2026-27";
const lakh = (v: number | null | undefined) => {
  if (v == null) return "—";
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  if (v >= 1e7) return `₹${trim(v / 1e7)} Cr`;
  if (v >= 1e5) return `₹${trim(v / 1e5)} L`;
  return exactInr(v);
};
const money = (inr: number, usd: number | null, isUsd: boolean) =>
  isUsd && usd ? `US$ ${Math.round(usd).toLocaleString("en-IN")}` : exactInr(inr);

/** The fee cell: exact for a 2026-27 notice, a bracket with * for a listing figure; both branches named. */
function feeCell(r: MatrixRow): { main: string; sub: string | null } {
  // Same figure as shown: dollars for a dollar-charging row, rupees otherwise.
  const same = r.usd ? (r.low.usd ?? 0) === (r.high.usd ?? 0) : r.low.inr === r.high.inr;
  const period = r.firstYear ? "in year 1" : "a year";
  const branches = same
    ? r.branches > 1
      ? `same for all ${r.branches} branches`
      : r.low.course
    : `${r.low.course} → ${r.high.course}`;
  if (r.official) {
    const main = same
      ? `${money(r.low.inr, r.low.usd, r.usd)} ${period}`
      : `${money(r.low.inr, r.low.usd, r.usd)} – ${money(r.high.inr, r.high.usd, r.usd)} ${period}`;
    return { main, sub: branches };
  }
  const bracket = approxFee(r.low.inr, r.high.inr) ?? "—";
  return { main: bracket.replace(" /yr*", " a year*"), sub: branches };
}
const seatText = (s: Seat | undefined) =>
  s ? `${s.usd ? `US$ ${Math.round(s.usd).toLocaleString("en-IN")}` : exactInr(s.inr)} a year at ${s.college}, for ${s.course} (${s.quota})` : "";

async function load(slug: string) {
  return getStateFeeMatrix(slug);
}

export async function generateMetadata(props: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const params = await props.params;
  const m = await load(params.state);
  if (!m) return { title: "State not found", robots: { index: false } };
  const g = m.bands.government.state?.median;
  const pm = m.bands.private.management?.median;
  return resolveMetadata(`/md-ms-india/fees/${m.slug}`, {
    // As searched: "<state> pg fees", "neet pg fees in <state>", "md ms fees in private medical colleges in <state>".
    title: fitTitle(
      `${m.state} PG Fees 2026-27: Govt, Private & Deemed MD/MS College Wise`,
      `NEET PG Fees in ${m.state} 2026-27: MD/MS Fees College Wise`,
      `${m.state} PG Fees 2026-27: MD/MS Fees College Wise`,
      `${m.state} PG Fees 2026-27, College Wise`,
    ),
    description: fitDescription(
      `MD/MS fees in ${m.state} for ${m.colleges.length} colleges, quota by quota${
        g ? `: government ${lakh(g)} a year` : ""
      }${pm ? `, private management ${lakh(pm)}` : ""} (middle figures). 2026-27 notices where out.`,
      `MD/MS fees at ${m.colleges.length} colleges in ${m.state}, government, private and deemed, quota by quota and branch by branch.`,
    ),
    keywords: `${m.state} PG fees, NEET PG fees ${m.state}, MD MS fees ${m.state}, ${m.state} private medical college PG fees, ${m.state} government medical college PG fees, ${m.state} deemed university PG fees, ${m.cities
      .slice(0, 4)
      .map((c) => `PG fees ${c.city}`)
      .join(", ")}`,
  });
}

const OWN_ORDER: Ownership[] = ["government", "private", "deemed"];

function FeeTable({ colleges, caption }: { colleges: MatrixCollege[]; caption: string }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <table className="dt w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">College</th>
            <th scope="col" className="px-4 py-3 font-semibold">Quota</th>
            <th scope="col" className="px-4 py-3 font-semibold">Fee (cheapest – dearest branch)</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Branches</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {colleges.map((c) =>
            c.rows.map((r, i) => {
              const cell = feeCell(r);
              return (
                <tr key={`${c.slug}-${i}`} id={i === 0 ? `c-${c.slug}` : undefined} className="align-top">
                  {i === 0 && (
                    <th scope="rowgroup" rowSpan={c.rows.length} className="w-[30%] px-4 py-3 font-medium">
                      <Link href={`/md-ms-india/colleges/${c.slug}`} className="text-foreground hover:text-primary hover:underline">
                        {c.short}
                      </Link>
                      {c.place && <span className="mt-0.5 block text-[12.5px] font-normal text-muted-foreground">{c.place}</span>}
                    </th>
                  )}
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">
                    <span className="block font-medium text-foreground">{FAMILY_LABEL[r.family]}</span>
                    {r.quotas.join(" / ")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="tnum block font-semibold text-foreground">{cell.main}</span>
                    {cell.sub && <span className="block text-[12.5px] text-muted-foreground">{cell.sub}</span>}
                    {r.official && (
                      <span className="mt-1 inline-block rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                        {FEE_YEAR} notice
                      </span>
                    )}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-muted-foreground">{r.branches}</td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function StateFeesPage(props: { params: Promise<{ state: string }> }) {
  const params = await props.params;
  const m = await load(params.state);
  if (!m) notFound();
  const path = `/md-ms-india/fees/${m.slug}`;
  const b = m.bands;
  const tokens = {
    state: m.state,
    year: FEE_YEAR,
    colleges: m.colleges.length,
    official: m.officialColleges,
    govt_colleges: b.government.state?.colleges ?? m.counts.government,
    private_colleges: m.counts.private,
    deemed_colleges: m.counts.deemed,
    govt_median: lakh(b.government.state?.median),
    private_state_median: lakh(b.private.state?.median),
    private_mgmt_median: lakh(b.private.management?.median),
    deemed_median: lakh(b.deemed.management?.median),
    nri_median: lakh(
      [b.private.nri?.median, b.deemed.nri?.median].filter((v): v is number => v != null).sort((x, y) => x - y)[0] ?? null,
    ),
    cheapest_mgmt: seatText(m.extremes.private_management?.low),
    dearest_mgmt: seatText(m.extremes.private_management?.high),
  };
  const [copy, body, heroImage, stipend] = await Promise.all([
    pageCopy("page.pg_fees_state.hero", tokens),
    pageCopy("page.pg_fees_state.body", tokens),
    pageHeroImage(`page.pg_fees_state.${m.slug}.hero`, "page.pg_stipend.hero"),
    getStateStipend(m.state),
  ]);

  const faqs = [
    ...(b.government.state?.median ? [{ question: body.faq1_q, answer: body.faq1_a }] : []),
    ...(b.private.state?.median && b.private.management?.median ? [{ question: body.faq2_q, answer: body.faq2_a }] : []),
    ...(b.deemed.management?.median ? [{ question: body.faq3_q, answer: body.faq3_a }] : []),
    ...(m.extremes.private_management ? [{ question: body.faq4_q, answer: body.faq4_a }] : []),
    ...(b.private.nri?.median || b.deemed.nri?.median ? [{ question: body.faq5_q, answer: body.faq5_a }] : []),
    { question: body.faq6_q, answer: body.faq6_a },
  ];
  const titles: Record<Ownership, string> = { government: body.govt_title, private: body.private_title, deemed: body.deemed_title };
  // A city with its own indexed page (lib/cityQueries.ts) links it from its heading.
  const cityPages = new Map((await getCityIndex().catch((): Awaited<ReturnType<typeof getCityIndex>> => [])).filter((c) => c.indexable && c.state === m.state).map((c) => [c.slug, `/medical-colleges/${c.slug}`]));
  const cityLink = (place: string) => {
    const c = cityIn(place);
    return c && c.state === m.state ? cityPages.get(c.slug) ?? null : null;
  };

  faqs.push(
    ...(await hinglishFaqs("fees_state", {
      ...tokens,
      // One management seat is both ends: the "dearest" question would repeat the "cheapest" one.
      dearest_mgmt: tokens.dearest_mgmt !== tokens.cheapest_mgmt ? tokens.dearest_mgmt : undefined,
    })),
  );
  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "PG fees by state", path: "/md-ms-india/fees" },
            { name: m.state, path },
          ]),
          webPage({ name: `${m.state} MD/MS fees, college by college`, description: copy.subtitle, path }),
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "MD/MS in India", href: "/md-ms-india" },
          { label: "PG fees", href: "/md-ms-india/fees" },
          { label: m.state },
        ]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        image={heroImage}
        topic="money"
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_fees_state"
        source={copy.source}
        visual={
          <HeroFacts
            title={`${m.state} · fee a year, middle figure`}
            facts={[
              ...(b.government.state ? [{ label: "Govt college, state quota", value: lakh(b.government.state.median), sub: `${b.government.state.colleges} colleges` }] : []),
              ...(b.private.state ? [{ label: "Private, state quota", value: lakh(b.private.state.median), sub: `${b.private.state.colleges} colleges` }] : []),
              ...(b.private.management ? [{ label: "Private, management", value: lakh(b.private.management.median), sub: `${b.private.management.colleges} colleges` }] : []),
              ...(b.deemed.management ? [{ label: "Deemed, paid seat", value: lakh(b.deemed.management.median), sub: `${b.deemed.management.colleges} universities` }] : []),
            ]}
            footnote="One figure per college — the middle of its branches — then the middle across colleges."
          />
        }
        insights={[
          { icon: "college" as const, label: "Colleges with a fee", value: String(m.colleges.length), note: `${m.counts.government} govt · ${m.counts.private} private · ${m.counts.deemed} deemed` },
          { icon: "authority" as const, label: `${FEE_YEAR} notices`, value: `${m.officialColleges} of ${m.colleges.length}`, note: "printed exactly; the rest as listed*" },
          ...(m.cities.length ? [{ icon: "people" as const, label: "Cities", value: String(m.cities.length), note: m.cities.slice(0, 3).map((c) => c.city).join(", ") }] : []),
        ]}
      />

      {OWN_ORDER.filter((o) => m.counts[o] > 0).map((own) => (
        <section key={own} id={own} className="container-custom py-8 md:py-12">
          <SectionHead icon="money" eyebrow={`${m.state} · ${m.counts[own]}`} title={titles[own]} intro={body.table_intro} />
          <FeeTable colleges={m.colleges.filter((c) => c.ownership === own)} caption={titles[own]} />
        </section>
      ))}

      <section className="container-custom pb-8">
        <p className="flex gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-[13.5px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{copy.source}</span>
        </p>
      </section>

      <section className="container-custom pb-10 md:pb-14">
        <ExpertPlaybook bare kind="fees" name={m.state} placement="pg_fees_state" />
        <DataPageCounsel kind="state" name={m.state} placement="counsel_pg_fees_state" />
      </section>

      {m.cities.length > 1 && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="map" eyebrow={m.state} title={body.city_title} />
            <div className="mt-6 lg:columns-2 [&>div]:break-inside-avoid">
              {m.cities.map((city) => (
                <div key={city.city} className="mb-4 rounded-2xl border border-border bg-card px-5 py-4">
                  <h3 className="font-heading font-bold text-foreground">
                    {cityLink(city.city) ? (
                      <Link href={cityLink(city.city)!} className="hover:text-primary hover:underline">
                        PG fees in {city.city}
                      </Link>
                    ) : (
                      <>PG fees in {city.city}</>
                    )}{" "}
                    <span className="font-normal text-muted-foreground">· {city.colleges}</span>
                  </h3>
                  <ul className="mt-2 space-y-1 text-[14px]">
                    {m.colleges
                      .filter((c) => c.place === city.city)
                      .map((c) => (
                        <li key={c.slug}>
                          <a href={`#c-${c.slug}`} className="text-primary-strong hover:underline dark:text-primary">
                            {c.short}
                          </a>{" "}
                          <span className="text-muted-foreground">· {c.ownership === "government" ? "Govt" : c.ownership === "deemed" ? "Deemed" : "Private"}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
          <Link href={`/md-ms-india/states/${m.slug}`} className="font-semibold text-primary-strong hover:underline">
            MD/MS in {m.state}: cut off and seats
          </Link>{" "}
          ·{" "}
          {stipend && (
            <>
              <Link href={`/md-ms-india/stipend/${m.slug}`} className="font-semibold text-primary-strong hover:underline">
                {m.state} PG stipend
              </Link>{" "}
              ·{" "}
            </>
          )}
          <Link href="/md-ms-india/bond" className="font-semibold text-primary-strong hover:underline">
            PG bond by state
          </Link>{" "}
          ·{" "}
          <Link href="/md-ms-india/fees" className="font-semibold text-primary-strong hover:underline">
            PG fees in every state
          </Link>{" "}
          ·{" "}
          <Link href="/neet-pg-choice-filling" className="font-semibold text-primary-strong hover:underline">
            Choice filling, upgrade and free exit
          </Link>
        </p>
      </section>

      <LeadCapture level="pg" source={`PG fees page (${m.state})`} title={body.lead_title} body={body.lead_body} />
      <TelegramJoin placement="pg_fees_state" />
    </main>
  );
}
