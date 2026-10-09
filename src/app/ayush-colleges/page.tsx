import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { Search } from "lucide-react";
import { getOtherUgColleges, type OtherUgCollege } from "@/lib/cutoffHubQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";

/**
 * BAMS, BHMS, BUMS, BSMS — and B.Sc Nursing and BVSc — colleges with published
 * NEET UG closing ranks. Their pages existed and nothing linked to them (162
 * orphans in the 2026-10-09 crawl); this is their index. Each college page
 * carries its own ranks.
 */

const PATH = "/ayush-colleges";
const SITE = "https://www.admissionhands.com";
const LABEL: Record<string, string> = {
  BAMS: "BAMS (Ayurveda)",
  BHMS: "BHMS (Homoeopathy)",
  BUMS: "BUMS (Unani)",
  BSMS: "BSMS (Siddha)",
  "B.Sc. Nursing": "B.Sc Nursing",
  BVSc: "BVSc (Veterinary)",
};
const ORDER = ["BAMS", "BHMS", "BUMS", "BSMS", "B.Sc. Nursing", "BVSc"];

export async function generateMetadata(): Promise<Metadata> {
  const all = await getOtherUgColleges();
  const n = (c: string) => new Set(all.filter((x) => x.course === c).map((x) => x.slug)).size;
  return resolveMetadata(PATH, {
    title: "BAMS & BHMS Colleges in India: NEET Cutoff, State-wise List",
    description: `${n("BAMS")} BAMS, ${n("BHMS")} BHMS and other AYUSH, nursing and veterinary colleges with published NEET UG closing ranks, state by state.`,
    keywords: "BAMS colleges in India, BHMS colleges in India, AYUSH colleges, BAMS cutoff, BHMS cutoff, BUMS colleges, BSMS colleges, NEET AYUSH counselling",
  });
}

export default async function AyushCollegesPage() {
  const all = await getOtherUgColleges();
  const courses = ORDER.filter((c) => all.some((x) => x.course === c)).concat(
    [...new Set(all.map((x) => x.course))].filter((c) => !ORDER.includes(c)),
  );
  const byCourse = new Map<string, Map<string, OtherUgCollege[]>>();
  for (const c of all) {
    const states = byCourse.get(c.course) ?? new Map<string, OtherUgCollege[]>();
    const k = c.state ?? "Other";
    states.set(k, [...(states.get(k) ?? []), c]);
    byCourse.set(c.course, states);
  }
  const count = (c: string) => [...(byCourse.get(c)?.values() ?? [])].reduce((a, l) => a + l.length, 0);

  const faqs = [
    {
      question: "How many BAMS and BHMS colleges are there in India?",
      answer: `We list ${count("BAMS")} BAMS and ${count("BHMS")} BHMS colleges with published NEET UG closing ranks, each with its own page of ranks.`,
    },
    {
      question: "Is admission to BAMS and BHMS through NEET?",
      answer:
        "Yes. BAMS, BHMS, BUMS and BSMS seats are filled on NEET UG scores — the All India Quota and deemed seats by AACCC, the rest by each state's own counselling.",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "AYUSH colleges", path: PATH },
          ]),
          webPage({ name: "BAMS, BHMS and AYUSH colleges in India", description: "AYUSH, nursing and veterinary colleges with NEET UG closing ranks.", path: PATH }),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "AYUSH colleges in India",
            numberOfItems: all.length,
            itemListElement: all.slice(0, 300).map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.name,
              url: `${SITE}/mbbs-india/colleges/${c.slug}`,
            })),
          },
          faqPage(faqs),
        ]}
      />
      <section className="relative overflow-hidden bg-slate-950">
        <div className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] opacity-50" aria-hidden="true" />
        <div className="container-custom relative py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-slate-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">AYUSH colleges</span>
          </nav>
          <h1 className="font-heading max-w-[26ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            BAMS, BHMS and <span className="text-cyan-300">AYUSH colleges in India</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            Every Ayurveda, Homoeopathy, Unani and Siddha college — and nursing and veterinary colleges — with published NEET UG
            closing ranks. Open a college for its ranks, quota by quota.
          </p>
          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {courses.slice(0, 4).map((c) => (
              <div key={c}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{LABEL[c] ?? c}</dt>
                <dd className="tnum mt-1 text-xl font-bold text-white md:text-2xl">{count(c)}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/neet-college-predictor?course=mbbs"
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            <Search className="h-4 w-4" aria-hidden="true" /> Check MBBS and BDS seats for your rank
          </Link>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <ul className="mb-8 flex flex-wrap gap-2" aria-label="Courses">
          {courses.map((c) => (
            <li key={c}>
              <a
                href={`#${c.replace(/\W+/g, "-").toLowerCase()}`}
                className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm text-foreground hover:border-primary hover:text-primary"
              >
                {LABEL[c] ?? c} · {count(c)}
              </a>
            </li>
          ))}
        </ul>
        <div className="space-y-12">
          {courses.map((c) => (
            <div key={c} id={c.replace(/\W+/g, "-").toLowerCase()}>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {LABEL[c] ?? c} colleges <span className="tnum text-base font-normal text-muted-foreground">· {count(c)}</span>
              </h2>
              <div className="mt-5 space-y-6">
                {[...(byCourse.get(c)?.entries() ?? [])].map(([state, list]) => (
                  <div key={state}>
                    <h3 className="text-base font-semibold text-foreground">
                      {state} <span className="tnum text-sm font-normal text-muted-foreground">· {list.length}</span>
                    </h3>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {list.map((x) => (
                        <li key={x.slug}>
                          <Link
                            href={`/mbbs-india/colleges/${x.slug}`}
                            className="flex h-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary"
                          >
                            {x.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom space-y-3">
          {faqs.map((q) => (
            <details key={q.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{q.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{q.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <LeadCapture
        level="ug"
        source="AYUSH colleges page"
        title="Weighing BAMS or BHMS against MBBS and BDS?"
        body="A counsellor sets every option your NEET rank reaches — MBBS, BDS and AYUSH, AIQ and state — against the published closing ranks."
      />
    </main>
  );
}
