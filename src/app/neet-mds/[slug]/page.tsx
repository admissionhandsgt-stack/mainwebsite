import { fitTitle } from "@/lib/seoTitle";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { notFound } from "next/navigation";
import { getMdsCourse, getMdsOverview, type MdsCut } from "@/lib/mdsQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";
import DataHero from "@/components/hero/DataHero";
import HeroFacts from "@/components/hero/HeroFacts";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";

import SectionHead from "@/components/ui/SectionHead";
/** One MDS speciality: its cutoff by quota and category, and where it is taught. */

type Props = { params: { slug: string } };
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

function CutTable({ cuts }: { cuts: MdsCut[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Quota</th>
            <th scope="col" className="px-4 py-3 font-semibold">Category</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Round 1 close</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Last admitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cuts.map((c) => (
            <tr key={`${c.quota}|${c.category}`}>
              <th scope="row" className="px-4 py-3 font-medium text-foreground">{c.quota}</th>
              <td className="px-4 py-3 text-muted-foreground">{c.category}</td>
              <td className="tnum px-4 py-3 text-right">{n(c.r1)}</td>
              <td className="tnum px-4 py-3 text-right font-semibold">{n(c.last)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getMdsCourse(params.slug);
  if (!c) return { title: "Speciality not found", robots: { index: false } };
  const aiq = c.cuts.find((x) => x.quota === "All India" && x.category === "Open");
  return resolveMetadata(`/neet-mds/${c.slug}`, {
    title: fitTitle(
      `MDS ${c.course} Cutoff ${c.year ?? ""}: NEET MDS Rank & Colleges`,
      `MDS ${c.course} Cutoff ${c.year ?? ""}`,
      `${c.course} MDS Cutoff`,
    ),
    description: `NEET MDS ${c.year ?? ""}, ${c.course}: AIQ Open closed at ${n(aiq?.r1)} in round 1, last admitted ${n(aiq?.last)}. Every quota, category and college.`,
    keywords: `MDS ${c.course} cutoff, NEET MDS ${c.course}, MDS ${c.course} colleges, ${c.course} MDS rank, MDS ${c.course} deemed cutoff`,
  });
}

export default async function MdsCoursePage({ params }: Props) {
  const c = await getMdsCourse(params.slug);
  if (!c) notFound();
  const siblings = (await getMdsOverview()).courses
    .filter((o) => o.slug !== c.slug)
    .map((o) => ({ slug: o.slug, name: `MDS ${o.course}` }));
  const path = `/neet-mds/${c.slug}`;
  const aiq = c.cuts.find((x) => x.quota === "All India" && x.category === "Open");
  // Words from Admin → Content → Text & numbers ("Page: NEET MDS course pages"); photo from Admin → Media.
  const [copy, heroImage] = await Promise.all([
    pageCopy("page.neet_mds_course.hero", { course: c.course, year: c.year ?? "" }),
    pageHeroImage(`page.neet_mds_course.${c.slug}.hero`, "page.neet_mds_course.hero"),
  ]);

  const faqs = [
    ...(aiq && c.year
      ? [
          {
            question: `What was the NEET MDS ${c.year} cutoff for ${c.course}?`,
            answer: `All India Quota, Open category: round 1 closed at rank ${n(aiq.r1)} and the last seat went at ${n(aiq.last)} across all rounds. Other quotas and categories are in the table on this page.`,
          },
        ]
      : []),
    {
      question: `Which colleges offer MDS ${c.course}?`,
      answer: `In MCC's ${c.year} counselling, ${c.institutes.length} institutes allotted MDS ${c.course} seats — listed on this page by state.`,
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET MDS cutoff", path: "/neet-mds-cutoff" },
            { name: `MDS ${c.course}`, path },
          ]),
          webPage({ name: `MDS ${c.course} cutoff`, description: `NEET MDS closing ranks for ${c.course}.`, path }),
          faqPage(faqs),
        ]}
      />
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "NEET MDS cutoff", href: "/neet-mds-cutoff" }, { label: c.course }]}
        eyebrow={copy.eyebrow}
        title={`MDS ${c.course}:`}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={
          aiq
            ? [
                { label: "AIQ Open, round 1", value: n(aiq.r1), note: "close" },
                { label: "AIQ Open, last", value: n(aiq.last), note: "admitted" },
                { label: "Colleges", value: n(c.institutes.length) },
              ]
            : [{ label: "Colleges", value: n(c.institutes.length) }]
        }
        cta={{ label: copy.cta, href: "/contact" }}
        telegram="hero_neet_mds_course"
        source={copy.source}
        image={heroImage}
        topic="course"
        visual={
          <HeroFacts
            title={copy.visual_title}
            facts={[
              { label: "Quota × category rows", value: n(c.cuts.length), sub: `filled by MCC in ${c.year}` },
              { label: "Colleges", value: n(c.institutes.length), sub: "that allotted it" },
              ...(aiq ? [{ label: "AIQ Open range", value: `${n(aiq.r1)} – ${n(aiq.last)}`, sub: "round 1 close to last admitted", wide: true }] : []),
            ]}
            footnote="NEET MDS All India Ranks from MCC's published results; a range over every college that offers it."
          />
        }
      />

      <section className="container-custom py-10 md:py-14">
        <SectionHead
          icon="chart"
          title={<>MDS {c.course} cutoff {c.year}, by quota and category</>}
        />
        <div className="mt-5">
          <CutTable cuts={c.cuts} />
        </div>
        {c.current && c.currentCuts.length > 0 && (
          <>
            <h3 className="mt-10 text-lg font-semibold text-foreground">
              {c.current.year} so far ({c.current.rounds.join(", ")})
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">Counselling is still running; later rounds usually reach further.</p>
            <div className="mt-3">
              <CutTable cuts={c.currentCuts} />
            </div>
          </>
        )}
      </section>

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <SectionHead
            icon="branch"
            title={<>Where MDS {c.course} is taught</>}
          />
          <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {c.institutes.map((i) => (
              <li key={i.name} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-foreground">{i.name}</span>
                  {i.state && <span className="block text-[12px] text-muted-foreground">{i.state}</span>}
                </span>
                {i.seats > 0 && <span className="tnum shrink-0 text-[12px] text-muted-foreground">{i.seats} seats</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <div className="space-y-3">
          {faqs.map((q) => (
            <details key={q.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{q.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{q.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/neet-mds-cutoff" className="font-semibold text-primary-strong hover:underline">Every MDS speciality →</Link>
        </p>
      </section>

      <LeadCapture
        level="pg"
        source={`NEET MDS — ${c.course}`}
        title={`Aiming for MDS ${c.course}?`}
        body="A counsellor builds your MDS choice list college by college against MCC's results — AIQ, deemed and your state quota."
      />
      {siblings.length > 0 && (
        <section className="container-custom border-t border-border py-10">
          <h2 className="font-heading text-xl font-bold text-foreground">Other MDS specialities</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {siblings.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/neet-mds/${o.slug}`}
                  className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
