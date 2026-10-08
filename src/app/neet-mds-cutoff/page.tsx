import CiteThis from "@/components/seo/CiteThis";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getMdsOverview } from "@/lib/mdsQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";

/** NEET MDS cutoff, speciality by speciality — for BDS graduates. See lib/mdsQueries.ts. */

const PATH = "/neet-mds-cutoff";
const n = (v: unknown) => (v == null ? "—" : Number(v).toLocaleString("en-IN"));

export async function generateMetadata(): Promise<Metadata> {
  const o = await getMdsOverview();
  return resolveMetadata(PATH, {
    title: `NEET MDS Cutoff ${o.year ?? ""}: Speciality-wise Closing Rank`,
    description: `NEET MDS ${o.year ?? ""} closing ranks for all ${o.courses.length} specialities — All India Quota by category and deemed seats, round 1 and the last rank admitted.`,
    keywords:
      "NEET MDS cutoff, NEET MDS cutoff 2025, MDS orthodontics cutoff, MDS cutoff rank, NEET MDS deemed university cutoff, MDS seats in India, NEET MDS closing rank",
  });
}

export default async function NeetMdsCutoffPage() {
  const o = await getMdsOverview();
  const hardest = o.courses[0];
  const open = o.categories.find((c) => c.category === "Open");

  const faqs = [
    ...(hardest && o.year
      ? [
          {
            question: `Which MDS speciality has the highest cutoff?`,
            answer: `In ${o.year}, ${hardest.course} filled first: All India Quota Open seats were all taken by rank ${n(hardest.aiqLast)}, and round 1 closed at ${n(hardest.aiqR1)}. The table lists every speciality in that order.`,
          },
        ]
      : []),
    ...(open && o.year
      ? [
          {
            question: `What was the NEET MDS ${o.year} cutoff for a government college (All India Quota)?`,
            answer: `For the Open category, All India Quota MDS seats closed at rank ${n(open.r1)} in round 1 and the last was taken at ${n(open.last)} across all rounds. Each speciality and college closed somewhere in between.`,
          },
        ]
      : []),
    {
      question: "Who conducts NEET MDS counselling?",
      answer:
        "MCC runs the 50% All India Quota of government dental colleges and every seat in deemed universities, plus the central and university quotas. The other 50% of government seats and private colleges' seats are filled by each state.",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET MDS cutoff", path: PATH },
          ]),
          webPage({ name: `NEET MDS cutoff ${o.year ?? ""}`, description: "MDS closing ranks by speciality, quota and category.", path: PATH }),
          faqPage(faqs),
        ]}
      />
      <section className="relative overflow-hidden bg-slate-950">
        <div className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] opacity-50" aria-hidden="true" />
        <div className="container-custom relative py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-slate-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">NEET MDS cutoff</span>
          </nav>
          <h1 className="font-heading max-w-[26ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            NEET MDS cutoff {o.year}: <span className="text-cyan-300">every speciality</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            Where All India Quota and deemed-university MDS seats ran out in MCC&apos;s {o.year} counselling
            {o.current ? `, with ${o.current.year} so far (${o.current.rounds.join(", ")})` : ""}. Ranks are NEET MDS All India Ranks.
          </p>
          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { k: "Specialities", v: n(o.courses.length) },
              { k: `Round 1 seats, ${o.year}`, v: n(o.courses.reduce((a, c) => a + c.seats, 0)) },
              ...(open ? [{ k: "AIQ Open, last admitted", v: n(open.last) }] : []),
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
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">MDS cutoff by speciality</h2>
        <p className="mt-2 max-w-[72ch] text-[13px] text-muted-foreground">
          Open category. <strong className="font-semibold text-foreground">Round 1 close</strong>: the last rank allotted in round 1.{" "}
          <strong className="font-semibold text-foreground">Last admitted</strong>: the furthest any round reached. Deemed = MCC&apos;s
          management / paid seats in deemed universities. Hardest first.
        </p>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Speciality</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">AIQ round 1 close</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">AIQ last admitted</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Deemed last admitted</th>
                {o.current && <th scope="col" className="px-4 py-3 text-right font-semibold">{o.current.year} AIQ so far</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {o.courses.map((c) => (
                <tr key={c.slug}>
                  <th scope="row" className="px-4 py-3 font-medium">
                    <Link href={`/neet-mds/${c.slug}`} className="text-foreground hover:text-primary hover:underline">
                      MDS {c.course}
                    </Link>
                  </th>
                  <td className="tnum px-4 py-3 text-right">{n(c.aiqR1)}</td>
                  <td className="tnum px-4 py-3 text-right font-semibold">{n(c.aiqLast)}</td>
                  <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(c.deemedLast)}</td>
                  {o.current && <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(c.currentAiqLast)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {o.categories.length > 0 && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              All India Quota by category, {o.year}
            </h2>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Round 1 close</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Last admitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {o.categories.map((c) => (
                    <tr key={String(c.category)}>
                      <th scope="row" className="px-4 py-3 font-semibold text-foreground">{String(c.category)}</th>
                      <td className="tnum px-4 py-3 text-right">{n(c.r1)}</td>
                      <td className="tnum px-4 py-3 text-right font-semibold">{n(c.last)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="container-custom py-10 md:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">NEET MDS: common questions</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((q) => (
            <details key={q.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{q.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{q.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Also: <Link href="/bds-india" className="font-semibold text-primary hover:underline">BDS colleges and cutoff</Link>
        </p>
      </section>

      <section className="container-custom pb-10">
        <CiteThis title={`NEET MDS cutoff ${o.year ?? ""} by speciality`} path="/neet-mds-cutoff" source={"MCC's NEET MDS results"} />
      </section>

      <LeadCapture
        level="pg"
        source="NEET MDS cutoff page"
        title="Planning your MDS choices?"
        body="A counsellor orders your MDS specialities and colleges — AIQ, deemed and your state — against MCC's published results and your budget."
      />
    </main>
  );
}
