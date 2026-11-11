import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { faqLines } from "@/lib/hinglishFaq";
import { getCityPage, getCityIndex, type CityCollege } from "@/lib/cityQueries";
import { getStateAuthority } from "@/lib/stateAuthorities";
import { MATRIX_LABEL } from "@/lib/pgSeatData";
import type { Family, Ownership } from "@/lib/pgFeeMatrix";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import ExpertPlaybook from "@/components/lead/ExpertPlaybook";
import FeePdfCta from "@/components/lead/FeePdfCta";

/**
 * Medical colleges in a city (2026-11-11; the city-pages spec). One page per city — PG fees by kind of seat, NMC's
 * MD/MS seats, stipend, bond, the branches taught, MCC's seats and the counselling, the city's MBBS colleges and DNB
 * hospitals — every figure from that city's own colleges (lib/cityQueries.ts). A city with 3–4 MD/MS colleges (or too
 * few with a fee) is `noindex, follow`; under 3 is a 404. Words: Admin → Content → "Page: medical colleges in a city".
 */

const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const lakh = (v: number | null | undefined) => {
  if (v == null) return "—";
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  if (v >= 1e7) return `₹${trim(v / 1e7)} Cr`;
  if (v >= 1e5) return `₹${trim(v / 1e5)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};
const OWN: Record<Ownership, string> = { government: "Government colleges", private: "Private colleges", deemed: "Deemed universities" };
const FAM: Record<Family, string> = { state: "State quota", aiq: "All India Quota", management: "Management / paid", nri: "NRI" };
const FEE_ROWS: [Family, string][] = [
  ["state", "State"],
  ["management", "Mgmt"],
  ["nri", "NRI"],
];

async function load(slug: string) {
  return getCityPage(slug).catch(() => null);
}

export async function generateStaticParams() {
  const all: Awaited<ReturnType<typeof getCityIndex>> = await getCityIndex().catch(() => []);
  return all.filter((c) => c.indexable).map((c) => ({ city: c.slug }));
}

export async function generateMetadata(props: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await props.params;
  const p = await load(city);
  if (!p) return { title: "Medical colleges", robots: { index: false, follow: true } };
  const c = p.city.name;
  const govtFee = p.bands.find((b) => b.own === "government" && b.family === "state")?.median;
  const mgmtFee = p.bands.find((b) => b.own === "private" && b.family === "management")?.median ?? p.bands.find((b) => b.own === "deemed" && b.family === "management")?.median;
  const meta = await resolveMetadata(`/medical-colleges/${p.city.slug}`, {
    title: fitTitle(
      `PG Fees in ${c} 2026-27: ${p.colleges.length} MD/MS Colleges, Seats & Stipend`,
      `Medical Colleges in ${c}: PG Fees 2026-27, MD/MS Seats & Stipend`,
      `MD/MS Colleges in ${c}: Fees, Seats & Stipend`,
      `PG Fees in ${c} 2026-27`,
    ),
    description: fitDescription(
      `${p.colleges.length} MD/MS colleges in ${c} with ${n(p.nmcSeats)} NMC seats.${govtFee ? ` PG fee: government ${lakh(govtFee)} a year` : ""}${mgmtFee ? `${govtFee ? "," : " PG fee:"} management ${lakh(mgmtFee)}` : ""}${p.stipend?.median ? `; stipend ${lakh(p.stipend.median)} a month` : ""}. College by college, with bond and branches.`,
      `${p.colleges.length} MD/MS colleges in ${c}: 2026-27 PG fees, NMC seats, stipend, bond and branches, college by college.`,
    ),
    keywords: `pg fees in ${c.toLowerCase()}, md ms colleges in ${c.toLowerCase()}, medical colleges in ${c.toLowerCase()}, md seats in ${c.toLowerCase()}, pg stipend ${c.toLowerCase()}, private medical college ${c.toLowerCase()} fees`,
  });
  return p.entry.indexable ? meta : { ...meta, robots: { index: false, follow: true } };
}

function FeeCell({ c }: { c: CityCollege }) {
  const rows = FEE_ROWS.map(([fam, label]) => [label, c.fees[fam] ?? (fam === "state" ? c.fees.aiq : undefined)] as const).filter(([, f]) => f);
  if (!rows.length) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="block space-y-0.5">
      {rows.map(([label, f]) => (
        <span key={label} className="block whitespace-nowrap">
          <span className="text-muted-foreground">{label}:</span>{" "}
          <span className="tnum font-medium text-foreground">
            {f!.lo === f!.hi ? lakh(f!.lo) : `${lakh(f!.lo)} – ${lakh(f!.hi)}`}
            {!f!.official && "*"}
          </span>
        </span>
      ))}
    </span>
  );
}

export default async function CityPage(props: { params: Promise<{ city: string }> }) {
  const { city: slug } = await props.params;
  const p = await load(slug);
  if (!p) notFound();
  const path = `/medical-colleges/${p.city.slug}`;
  const others = p.colleges.length - p.govt;
  const authority = await getStateAuthority(p.city.state).catch(() => null);
  const band = (own: Ownership, fam: Family) => p.bands.find((b) => b.own === own && b.family === fam);
  const aiqSeats = p.mcc.byMatrix.find((m) => m.matrix === "AIQ")?.seats;
  const mbbsSeats = p.mbbs.reduce((s, m) => s + (m.seats ?? 0), 0);
  const tokens = {
    city: p.city.name,
    state: p.city.state,
    mdms: p.colleges.length,
    seats: p.nmcSeats ? n(p.nmcSeats) : undefined,
    govt: p.govt,
    others,
    govt_fee: lakh(band("government", "state")?.median),
    private_fee: lakh(band("private", "state")?.median),
    mgmt_fee: lakh(band("private", "management")?.median),
    deemed_fee: lakh(band("deemed", "management")?.median),
    stipend: lakh(p.stipend?.median),
    stipend_colleges: p.stipend?.colleges,
    govt_stipend: lakh(p.stipend?.govtMedian),
    bonded: p.bond?.govt ? p.bond.bonded : undefined,
    govt_terms: p.bond?.govt,
    bond_years: p.bond?.years ? `${p.bond.years} year${p.bond.years === 1 ? "" : "s"}` : undefined,
    authority: authority && authority.scope === "UG and PG" ? authority.authority : `${p.city.state}'s own counselling authority`,
    mbbs: p.mbbs.length >= 2 ? p.mbbs.length : undefined,
    mbbs_seats: mbbsSeats ? n(mbbsSeats) : undefined,
    aiq_seats: aiqSeats ? n(aiqSeats) : undefined,
  };
  const [c, heroImage] = await Promise.all([pageCopy("page.city", tokens), pageHeroImage(`page.city.${p.city.slug}.hero`, "page.city.hero")]);
  const faqs = faqLines(c.faq, tokens);
  const stateSlug = p.entry.stateSlug;

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "Medical colleges by city", path: "/medical-colleges" },
            { name: p.city.name, path },
          ]),
          webPage({ name: `Medical colleges in ${p.city.name}`, description: c.subtitle, path, dateModified: p.updated ?? undefined }),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `MD/MS colleges in ${p.city.name}`,
            numberOfItems: p.colleges.length,
            itemListElement: p.colleges.map((col, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: col.short,
              url: `https://www.admissionhands.com/md-ms-india/colleges/${col.slug}`,
            })),
          },
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Medical colleges by city", href: "/medical-colleges" }, { label: p.city.name }]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={c.accent}
        subtitle={p.nmcSeats ? c.answer : c.subtitle}
        image={heroImage}
        topic="college"
        cta={{ label: c.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_city"
        source={c.source}
        insights={[
          { icon: "college" as const, label: "MD/MS colleges", value: String(p.colleges.length), note: `${p.govt} government · ${others} private or deemed` },
          ...(p.nmcSeats ? [{ icon: "people" as const, label: "MD/MS seats (NMC)", value: n(p.nmcSeats), note: "approved on NMC's register" }] : []),
          ...(band("government", "state") ? [{ icon: "authority" as const, label: "Govt PG fee, middle", value: lakh(band("government", "state")!.median), note: "a year, state quota" }] : []),
          ...(p.stipend?.median ? [{ icon: "up" as const, label: "Stipend, year 1", value: lakh(p.stipend.median), note: `a month, middle of ${p.stipend.colleges} colleges` }] : []),
        ]}
      />
      <FeePdfCta state={p.city.state} placement="pdf_city" />

      {/* -------------------- the colleges -------------------- */}
      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="college" eyebrow={p.city.state} title={c.colleges_title} intro={c.colleges_intro} />
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="dt w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">College</th>
                <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">MD/MS seats</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">MBBS seats</th>
                <th scope="col" className="px-4 py-3 font-semibold">PG fee 2026-27, a year</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Stipend, year 1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border align-top">
              {p.colleges.map((x) => (
                <tr key={x.slug}>
                  <th scope="row" className="px-4 py-2.5 font-medium">
                    <Link href={`/md-ms-india/colleges/${x.slug}`} className="text-foreground hover:text-primary hover:underline">
                      {x.short}
                    </Link>
                    {x.founded && <span className="block text-[12px] font-normal text-muted-foreground">since {x.founded}</span>}
                  </th>
                  <td className="px-4 py-2.5 text-muted-foreground">{x.type}</td>
                  <td className="tnum px-4 py-2.5 text-right">{n(x.mdmsSeats)}</td>
                  <td className="tnum px-4 py-2.5 text-right">{n(x.mbbsSeats)}</td>
                  <td className="px-4 py-2.5 text-[13px]">
                    <FeeCell c={x} />
                  </td>
                  <td className="tnum px-4 py-2.5 text-right">{x.stipendY1 ? `${lakh(x.stipendY1)} /mo` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] text-muted-foreground">* As listed for the 2026 counselling — confirm with the college before you pay.</p>
      </section>

      {/* -------------------- fees -------------------- */}
      {p.bands.length > 0 && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="money" eyebrow="2026-27" title={c.fees_title} intro={c.fees_intro} />
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="dt w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Colleges</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Seat</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Middle, a year</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Middle 80%</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {p.bands.map((b) => (
                    <tr key={`${b.own}-${b.family}`}>
                      <th scope="row" className="px-4 py-2.5 font-medium text-foreground">{OWN[b.own]}</th>
                      <td className="px-4 py-2.5 text-muted-foreground">{FAM[b.family]}</td>
                      <td className="tnum px-4 py-2.5 text-right font-semibold">{lakh(b.median)}</td>
                      <td className="tnum px-4 py-2.5 text-right">{b.p10 != null && b.p90 != null ? `${lakh(b.p10)} – ${lakh(b.p90)}` : "—"}</td>
                      <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{b.colleges}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Every college of the state, quota by quota:{" "}
              <Link href={`/md-ms-india/fees/${stateSlug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                PG fees in {p.city.state}
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* -------------------- seats, counselling, stipend, bond -------------------- */}
      <section className="container-custom grid gap-6 py-10 md:py-14 lg:grid-cols-2">
        <div>
          <SectionHead icon="authority" eyebrow={p.mcc.year ? `MCC · ${p.mcc.year}` : "Counselling"} title={c.seats_title} />
          {p.mcc.byMatrix.length > 0 && (
            <ul className="mt-5 space-y-2 text-[15px]">
              {p.mcc.byMatrix.map((m) => (
                <li key={m.matrix} className="flex justify-between gap-4 rounded-xl border border-border bg-card px-4 py-2.5">
                  <span className="text-foreground">{MATRIX_LABEL[m.matrix] ?? m.matrix}</span>
                  <span className="tnum text-muted-foreground">
                    {n(m.seats)} seats · {m.colleges} college{m.colleges === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[15px] leading-relaxed text-foreground">
            {p.mcc.byMatrix.length ? "Those are MCC's seats in this city's colleges. " : ""}
            {authority && authority.scope === "UG and PG" ? (
              <>
                {p.city.state}&apos;s own quota is filled by{" "}
                <a href={authority.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-strong hover:underline dark:text-primary">
                  {authority.authority}
                </a>
                .
              </>
            ) : (
              <>{p.city.state}&apos;s own quota is filled by the state&apos;s counselling.</>
            )}{" "}
            <Link href={`/counselling/neet-pg/${stateSlug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
              NEET PG counselling in {p.city.state}
            </Link>{" "}
            ·{" "}
            <Link href={`/md-ms-india/states/${stateSlug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
              {p.city.state} cut off and seats
            </Link>
          </p>
        </div>
        <div>
          <SectionHead icon="coins" eyebrow="Year 1" title={c.stipend_title} />
          <ul className="mt-5 space-y-2 text-[15px]">
            {p.stipend?.median && (
              <li className="rounded-xl border border-border bg-card px-4 py-2.5">
                Stipend: <span className="tnum font-semibold">{lakh(p.stipend.median)}</span> a month in the middle ({p.stipend.colleges} colleges)
                {p.stipend.govtMedian ? `; government ${lakh(p.stipend.govtMedian)}` : ""}
                {p.stipend.otherMedian ? `; private and deemed ${lakh(p.stipend.otherMedian)}` : ""}.
              </li>
            )}
            {p.bond?.govt ? (
              <li className="rounded-xl border border-border bg-card px-4 py-2.5">
                Bond: {p.bond.bonded} of {p.bond.govt} government colleges list a service bond
                {p.bond.years ? `, usually ${p.bond.years} year${p.bond.years === 1 ? "" : "s"}` : ""}
                {p.bond.penaltyMedian ? `; breaking it costs ${lakh(p.bond.penaltyMedian)} in the middle` : ""}.
              </li>
            ) : null}
          </ul>
          <p className="mt-3 flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Bond terms are as listed for the 2026 counselling, not an official notice — confirm with the state&apos;s notice or the college before you sign.{" "}
              <Link href={`/md-ms-india/stipend/${stateSlug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                {p.city.state} PG stipend
              </Link>{" "}
              ·{" "}
              <Link href="/md-ms-india/bond" className="font-semibold text-primary-strong hover:underline dark:text-primary">
                PG bond by state
              </Link>
            </span>
          </p>
        </div>
      </section>

      {/* -------------------- branches -------------------- */}
      {p.branches.length > 0 && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="branch" eyebrow={`${p.branches.length} branches`} title={c.branches_title} />
            <p className="mt-5 text-[14.5px] leading-loose text-muted-foreground">
              {p.branches.map((b, i) => (
                <span key={b.slug}>
                  {i > 0 && " · "}
                  <Link href={`/md-ms-india/branches/${b.slug}`} className="font-medium text-foreground hover:text-primary hover:underline">
                    {b.course}
                  </Link>{" "}
                  <span className="tnum">({b.colleges})</span>
                </span>
              ))}
            </p>
            <p className="mt-2 text-[13px] text-muted-foreground">In brackets: how many of the city&apos;s colleges teach the branch.</p>
          </div>
        </section>
      )}

      <section className="container-custom py-10 md:py-12">
        <DataPageCounsel kind="cutoff" name={`PG in ${p.city.name}`} placement="counsel_city" />
      </section>

      {/* -------------------- MBBS and DNB -------------------- */}
      {(p.mbbs.length >= 2 || p.dnb.length > 0) && (
        <section className="container-custom grid gap-6 pb-10 md:pb-14 lg:grid-cols-2">
          {p.mbbs.length >= 2 && (
            <div>
              <SectionHead icon="course" eyebrow="NEET UG" title={c.mbbs_title} />
              <ul className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card text-[14.5px]">
                {p.mbbs.map((m) => (
                  <li key={m.slug} className="flex justify-between gap-4 px-4 py-2.5">
                    <Link href={`/mbbs-india/colleges/${m.slug}`} className="text-foreground hover:text-primary hover:underline">
                      {m.short}
                    </Link>
                    <span className="tnum shrink-0 text-muted-foreground">
                      {m.type ? `${m.type} · ` : ""}
                      {m.seats ? `${n(m.seats)} seats` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.dnb.length > 0 && (
            <div>
              <SectionHead icon="list" eyebrow={`${p.dnb.length} hospitals`} title={c.dnb_title} intro={c.dnb_intro} />
              <p className="mt-5 text-[14px] leading-loose text-muted-foreground">
                {p.dnb.map((d, i) => (
                  <span key={d.slug}>
                    {i > 0 && " · "}
                    <Link href={`/md-ms-india/colleges/${d.slug}`} className="hover:text-primary hover:underline">
                      {d.short}
                    </Link>
                  </span>
                ))}
              </p>
            </div>
          )}
        </section>
      )}

      <ExpertPlaybook kind="fees" name={`PG in ${p.city.name}`} placement="city" />

      {/* -------------------- FAQ -------------------- */}
      {faqs.length > 0 && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="help" eyebrow="FAQ" title={c.faq_title} />
            <div className="mt-6 space-y-3">
              {faqs.map((f) => (
                <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
                  <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
                </details>
              ))}
            </div>
            {p.nearby.length > 0 && (
              <p className="mt-6 text-sm text-muted-foreground">
                Nearby:{" "}
                {p.nearby.map((x, i) => (
                  <span key={x.slug}>
                    {i > 0 && " · "}
                    <Link href={`/medical-colleges/${x.slug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                      PG fees in {x.name}
                    </Link>
                  </span>
                ))}{" "}
                ·{" "}
                <Link href="/medical-colleges" className="font-semibold text-primary-strong hover:underline dark:text-primary">
                  every city
                </Link>
              </p>
            )}
          </div>
        </section>
      )}

      <LeadCapture level="pg" source={`City page — ${p.city.name}`} title={c.lead_title} body={c.lead_body} />
      <TelegramJoin placement="city" />
    </main>
  );
}
