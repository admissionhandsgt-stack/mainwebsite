import { fitTitle, count } from "@/lib/seoTitle";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { notFound } from "next/navigation";
import { getSsCourse, getSsCourses } from "@/lib/ssQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";
import DataHero from "@/components/hero/DataHero";
import HeroFacts from "@/components/hero/HeroFacts";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";

/** One DM / MCh / DrNB course: its cutoff over the years, and where it is taught. */

type Props = { params: { slug: string } };
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getSsCourse(params.slug);
  if (!c) return { title: "Course not found", robots: { index: false } };
  const y = c.years[0];
  return resolveMetadata(`/neet-ss/${c.slug}`, {
    title: fitTitle(
      `${c.course} Cutoff ${y?.year ?? ""}: NEET SS Rank, Seats & Colleges`,
      `${c.course} Cutoff ${y?.year ?? ""}: NEET SS Rank & Seats`,
      `${c.course} Cutoff ${y?.year ?? ""}`,
      `${c.course} NEET SS Cutoff`,
    ),
    description: `${c.course}: NEET SS ${y?.year ?? ""} round 1 closed at group rank ${n(y?.r1Close)}, last admitted ${n(y?.widest)}. ${y?.seats ?? ""} seats at ${c.institutes.length} institutes, state by state.`,
    keywords: `${c.course} cutoff, ${c.course} seats in India, ${c.course} colleges, NEET SS ${c.course}, ${c.course} rank`,
  });
}

export default async function SsCoursePage({ params }: Props) {
  const c = await getSsCourse(params.slug);
  if (!c) notFound();
  // Every course page links its group's other courses: a page linked only
  // from the hub was one of the 33 "single incoming link" pages in the audit.
  const siblings = (await getSsCourses()).courses
    .filter((o) => o.grp === c.grp && o.slug !== c.slug)
    .map((o) => ({ slug: o.slug, name: o.course }));
  const path = `/neet-ss/${c.slug}`;
  const [y, prev] = c.years;
  // Words from Admin → Content → Text & numbers ("Page: NEET SS course pages"); photo from Admin → Media.
  const [copy, heroImage] = await Promise.all([
    pageCopy("page.neet_ss_course.hero", { course: c.course, group: c.grp }),
    pageHeroImage(`page.neet_ss_course.${c.slug}.hero`, "page.neet_ss_course.hero"),
  ]);

  const faqs = [
    ...(y
      ? [
          {
            question: `What was the NEET SS ${y.year} cutoff for ${c.course}?`,
            answer: `In ${c.grp}, ${c.course} round 1 closed at group rank ${n(y.r1Close)}, and the last seat across all rounds (${y.rounds.join(", ")}) went at ${n(y.widest)}${prev ? `. In ${prev.year} the last seat went at ${n(prev.widest)}` : ""}.`,
          },
          {
            question: `How many ${c.course} seats are there in India?`,
            answer: `${n(y.seats)} seats were allotted in round 1 of the ${y.year} MCC counselling, at ${c.institutes.length} institutes in ${c.states.length} states.`,
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
            { name: "NEET SS cutoff", path: "/neet-ss-cutoff" },
            { name: c.course, path },
          ]),
          webPage({ name: `${c.course} cutoff`, description: `NEET SS closing ranks, seats and institutes for ${c.course}.`, path }),
          faqPage(faqs),
        ]}
      />
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "NEET SS cutoff", href: "/neet-ss-cutoff" }, { label: c.course }]}
        eyebrow={copy.eyebrow}
        title={`${c.course}:`}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={
          y
            ? [
                { label: `Round 1 close, ${y.year}`, value: n(y.r1Close), note: "group rank" },
                { label: `Last admitted, ${y.year}`, value: n(y.widest), note: "any round" },
                { label: "Seats, round 1", value: n(y.seats) },
                { label: "Institutes", value: n(c.institutes.length) },
              ]
            : []
        }
        cta={{ label: copy.cta, href: "/contact" }}
        telegram="hero_neet_ss_course"
        source={copy.source}
        image={heroImage}
        topic="branch"
        visual={
          <HeroFacts
            title={copy.visual_title}
            facts={[
              { label: "Group", value: c.grp, wide: true },
              ...(y ? [{ label: `${y.year} range`, value: `${n(y.r1Close)} – ${n(y.widest)}`, sub: "round 1 close to last admitted" }] : []),
              ...(prev ? [{ label: `${prev.year} range`, value: `${n(prev.r1Close)} – ${n(prev.widest)}`, sub: "the year before" }] : []),
              { label: "Institutes", value: n(c.institutes.length), sub: "that allotted it" },
              ...(y ? [{ label: "Seats, round 1", value: n(y.seats), sub: String(y.year) }] : []),
            ]}
            footnote="Group ranks from MCC's published results; a range over every institute that offers the course."
          />
        }
      />

      <section className="container-custom py-10 md:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">{c.course} cutoff by year</h2>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Session</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Seats</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Round 1 close</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Last admitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {c.years.map((r) => (
                <tr key={r.year}>
                  <th scope="row" className="px-4 py-3 font-semibold text-foreground">
                    NEET SS {r.year}
                    <span className="block text-[12px] font-normal text-muted-foreground">{r.rounds.join(", ")}</span>
                  </th>
                  <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(r.seats)}</td>
                  <td className="tnum px-4 py-3 text-right">{n(r.r1Close)}</td>
                  <td className="tnum px-4 py-3 text-right font-semibold">{n(r.widest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Where {c.course} is taught
          </h2>
          <p className="mt-2 max-w-[72ch] text-muted-foreground">
            {c.institutes.length} institutes, {y ? `seats allotted in round 1 of ${y.year}` : ""}. Which one closed at which rank is
            what a counsellor works from with you.
          </p>
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
          <Link href="/neet-ss-cutoff" className="font-semibold text-primary-strong hover:underline">Every DM, MCh and DrNB course →</Link>
        </p>
      </section>

      <LeadCapture
        level="pg"
        source={`NEET SS — ${c.course}`}
        title={`Aiming for ${c.course}?`}
        body="A counsellor builds your SS choice list institute by institute against two years of MCC results, and stays with you through every round."
      />
      {siblings.length > 0 && (
        <section className="container-custom border-t border-border py-10">
          <h2 className="font-heading text-xl font-bold text-foreground">Other courses in {c.grp}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {siblings.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/neet-ss/${o.slug}`}
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
