import CiteThis from "@/components/seo/CiteThis";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getMdsOverview } from "@/lib/mdsQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";

import SectionHead from "@/components/ui/SectionHead";
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
  // Words from Admin → Content → Text & numbers ("Page: NEET MDS cutoff"); photo from Admin → Media.
  const [copy, heroImage] = await Promise.all([pageCopy("page.neet_mds.hero", { year: o.year ?? "" }), pageHeroImage("page.neet_mds.hero")]);

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
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "NEET MDS cutoff" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "Specialities", value: n(o.courses.length) },
          { label: `Round 1 seats, ${o.year}`, value: n(o.courses.reduce((a, c) => a + c.seats, 0)) },
          ...(open ? [{ label: "AIQ Open, last admitted", value: n(open.last) }] : []),
        ]}
        cta={{ label: copy.cta, href: "/contact" }}
        telegram="hero_neet_mds"
        source={copy.source}
        image={heroImage}
        topic="course"
        visual={
          <HeroBars
            title={copy.visual_title}
            caption={`Seats allotted in round 1, ${o.year}`}
            rows={[...o.courses]
              .sort((a, b) => b.seats - a.seats)
              .slice(0, 7)
              .map((c) => ({ label: c.course, value: c.seats, display: `${c.seats} seats`, href: `/neet-mds/${c.slug}` }))}
          />
        }
      />

      <section className="container-custom py-10 md:py-14">
        <SectionHead
          icon="chart"
          title={<>MDS cutoff by speciality</>}
          intro={<>Open category. <strong className="font-semibold text-foreground">Round 1 close</strong>: the last rank allotted in round 1.{" "} <strong className="font-semibold text-foreground">Last admitted</strong>: the furthest any round reached. Deemed = MCC&apos;s management / paid seats in deemed universities. Hardest first.</>}
        />
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
            <SectionHead
              icon="authority"
              title={<>All India Quota by category, {o.year}</>}
            />
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
        <SectionHead
          icon="help"
          title={<>NEET MDS: common questions</>}
        />
        <div className="mt-6 space-y-3">
          {faqs.map((q) => (
            <details key={q.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{q.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{q.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Also: <Link href="/bds-india" className="font-semibold text-primary-strong hover:underline">BDS colleges and cutoff</Link>
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
      <TelegramJoin placement="neet_mds_cutoff" />
    </main>
  );
}
