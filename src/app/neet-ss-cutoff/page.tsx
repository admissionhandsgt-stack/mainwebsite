import CiteThis from "@/components/seo/CiteThis";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getSsCourses, type SsCourseSummary } from "@/lib/ssQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";

/**
 * NEET SS cutoff, course by course — for doctors already holding an MD/MS.
 * MCC's own round results (lib/ssQueries.ts). Group ranks throughout.
 */

const PATH = "/neet-ss-cutoff";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSsCourses();
  return resolveMetadata(PATH, {
    title: `NEET SS Cutoff ${s.year ?? ""}: DM, MCh & DrNB Closing Rank, Course-wise`,
    description: `NEET SS ${s.year ?? ""} closing ranks for all ${s.courses.length} DM, MCh and DrNB courses — round 1 and the last rank admitted, with ${s.prevYear ?? "last year"} beside it. From MCC's published results.`,
    keywords:
      "NEET SS cutoff, NEET SS cutoff 2024, DM cardiology cutoff, MCh neurosurgery cutoff, DM seats in India, NEET SS closing rank, super speciality cutoff, DrNB cutoff",
  });
}

export default async function NeetSsCutoffPage() {
  const s = await getSsCourses();
  const groups = new Map<string, SsCourseSummary[]>();
  for (const c of s.courses) groups.set(c.grp, [...(groups.get(c.grp) ?? []), c]);
  const totalSeats = s.courses.reduce((a, c) => a + c.seats, 0);
  const cardio = s.courses.find((c) => c.course === "DM Cardiology");
  const neuroSx = s.courses.find((c) => c.course === "MCh Neuro Surgery");
  const dmCount = s.courses.filter((c) => c.course.startsWith("DM ")).reduce((a, c) => a + c.seats, 0);
  // Words from Admin → Content → Text & numbers ("Page: NEET SS cutoff"); photo from Admin → Media.
  const [copy, heroImage] = await Promise.all([
    pageCopy("page.neet_ss.hero", { year: s.year ?? "", prev: s.prevYear ?? "" }),
    pageHeroImage("page.neet_ss.hero"),
  ]);

  const faqs = [
    ...(cardio
      ? [
          {
            question: `What was the NEET SS ${s.year} cutoff for DM Cardiology?`,
            answer: `In the Medical group, DM Cardiology round 1 closed at group rank ${n(cardio.r1Close)}, and the last seat across all rounds went at ${n(cardio.widest)}${cardio.prevWidest ? ` (${n(cardio.prevWidest)} in ${s.prevYear})` : ""}. ${cardio.seats} seats were allotted in round 1 across ${cardio.colleges} institutes.`,
          },
        ]
      : []),
    ...(neuroSx
      ? [
          {
            question: `What NEET SS rank is needed for MCh Neurosurgery?`,
            answer: `In ${s.year}, MCh Neuro Surgery (Surgical group) closed at group rank ${n(neuroSx.r1Close)} in round 1; the last seat went at ${n(neuroSx.widest)} across all rounds.`,
          },
        ]
      : []),
    {
      question: "How many DM and MCh seats are there in India?",
      answer: `In the ${s.year} MCC counselling, ${n(totalSeats)} SS seats were allotted in round 1 across ${s.courses.length} courses — ${n(dmCount)} of them DM. DrNB SS seats in NBEMS-accredited hospitals are counted in the same counselling.`,
    },
    {
      question: "Are NEET SS ranks all-India or group-wise?",
      answer:
        "Group-wise. Each NEET SS group — Medical, Surgical, Paediatric, Anaesthesiology and the rest — has its own merit list, so a rank only means something within its group. Every figure on this page is a group rank.",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET SS cutoff", path: PATH },
          ]),
          webPage({ name: `NEET SS cutoff ${s.year ?? ""}`, description: "DM, MCh and DrNB closing ranks, course by course.", path: PATH }),
          faqPage(faqs),
        ]}
      />
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "NEET SS cutoff" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "Courses", value: n(s.courses.length) },
          { label: "Seats, round 1", value: n(totalSeats), note: `allotted, ${s.year}` },
          { label: "Groups", value: n(groups.size) },
        ]}
        cta={{ label: copy.cta, href: "/contact" }}
        telegram="hero_neet_ss"
        source={copy.source}
        image={heroImage}
        topic="branch"
        visual={
          <HeroBars
            title={copy.visual_title}
            caption={`Seats allotted in round 1, ${s.year}`}
            rows={[...s.courses]
              .sort((a, b) => b.seats - a.seats)
              .slice(0, 7)
              .map((c) => ({ label: c.course, value: c.seats, display: `${c.seats} seats`, href: `/neet-ss/${c.slug}`, note: `${c.colleges} institutes` }))}
            footnote="Every course is in the tables below, group by group."
          />
        }
      />

      <section className="container-custom py-10 md:py-14">
        <p className="mb-6 max-w-[72ch] text-[13px] text-muted-foreground">
          <strong className="font-semibold text-foreground">Round 1 close</strong>: the last group rank allotted the course in
          round 1. <strong className="font-semibold text-foreground">Last admitted</strong>: the furthest any round reached.
        </p>
        <div className="space-y-10">
          {[...groups.entries()].map(([grp, list]) => (
            <div key={grp}>
              <h2 className="font-heading text-xl font-bold tracking-tight text-foreground md:text-2xl">{grp}</h2>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Course</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Seats</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Round 1 close</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Last admitted</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">{s.prevYear}, last</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {list.map((c) => (
                      <tr key={c.slug}>
                        <th scope="row" className="px-4 py-3 font-medium">
                          <Link href={`/neet-ss/${c.slug}`} className="text-foreground hover:text-primary hover:underline">
                            {c.course}
                          </Link>
                        </th>
                        <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(c.seats)}</td>
                        <td className="tnum px-4 py-3 text-right">{n(c.r1Close)}</td>
                        <td className="tnum px-4 py-3 text-right font-semibold">{n(c.widest)}</td>
                        <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(c.prevWidest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">NEET SS: common questions</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((q) => (
              <details key={q.question} className="rounded-2xl border border-border bg-card p-5">
                <summary className="cursor-pointer font-semibold text-foreground">{q.question}</summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{q.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="container-custom pb-10">
        <CiteThis title={`NEET SS cutoff ${s.year ?? ""} — DM, MCh and DrNB`} path="/neet-ss-cutoff" source={"MCC's NEET SS results"} />
      </section>

      <LeadCapture
        level="pg"
        source="NEET SS cutoff page"
        title="Planning your super-speciality choices?"
        body="A counsellor orders your DM / MCh / DrNB choices against two years of MCC results — institute, course and the round each one actually closes in."
      />
      <TelegramJoin placement="neet_ss_cutoff" />
    </main>
  );
}
