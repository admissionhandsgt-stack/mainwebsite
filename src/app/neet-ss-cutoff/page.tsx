import type { Metadata } from "next";
import Link from "next/link";
import { getSsCourses, type SsCourseSummary } from "@/lib/ssQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";

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
      <section className="relative overflow-hidden bg-slate-950">
        <div className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] opacity-50" aria-hidden="true" />
        <div className="container-custom relative py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-slate-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">NEET SS cutoff</span>
          </nav>
          <h1 className="font-heading max-w-[26ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            NEET SS cutoff {s.year}: <span className="text-cyan-300">DM, MCh and DrNB</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            Where every super-speciality course closed in MCC&apos;s {s.year} counselling — round 1 and the last rank admitted,
            with {s.prevYear} beside it. Ranks are group ranks.
          </p>
          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { k: "Courses", v: n(s.courses.length) },
              { k: "Seats, round 1", v: n(totalSeats) },
              { k: "Groups", v: n(groups.size) },
            ].map(({ k, v }) => (
              <div key={k}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="tnum mt-1 text-xl font-bold text-white md:text-2xl">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

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

      <LeadCapture
        level="pg"
        source="NEET SS cutoff page"
        title="Planning your super-speciality choices?"
        body="A counsellor orders your DM / MCh / DrNB choices against two years of MCC results — institute, course and the round each one actually closes in."
      />
    </main>
  );
}
