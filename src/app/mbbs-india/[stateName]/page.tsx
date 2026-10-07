import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Landmark, Search } from "lucide-react";
import { getStatePage, type StatePage } from "@/lib/stateQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";

/**
 * One page per state, read on the server.
 *
 * This was a client component that fetched its content from `/api/content/*`
 * after load. robots.txt keeps crawlers out of /api/, so Google saw a hero
 * reading "Study MBBS in" and nothing else — on 33 pages that were also linked
 * from nowhere, and any slug at all rendered a 200. See lib/stateQueries.ts.
 */

const SITE = "https://www.admissionhands.com";

type Props = { params: { stateName: string } };

/** Old slug -> current slug, for states whose address changed. */
const RENAMED: Record<string, string> = { chattisgarh: "chhattisgarh" };

function slugOf(raw: string): string {
  let s = raw;
  try {
    s = decodeURIComponent(raw);
  } catch {
    /* already decoded */
  }
  return s.toLowerCase();
}

const inr = (n: number) => n.toLocaleString("en-IN");

function describe(p: StatePage) {
  const bodies = p.counsellings.map((c) => c.name.replace(/ UG$/, "")).slice(0, 3);
  return (
    `${p.colleges.length} MBBS colleges in ${p.state.name}, each with its own page of NEET UG closing ranks` +
    (bodies.length ? `. Seats are filled through ${bodies.join(", ")} counselling` : "") +
    `. Published counselling data, not estimates.`
  );
}

/** The search snippet: under ~155 characters, where Google cuts. */
function snippet(p: StatePage) {
  return `${p.colleges.length} MBBS colleges in ${p.state.name} with NEET UG closing ranks by quota and category, and which counselling fills each seat.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = slugOf(params.stateName);
  const p = await getStatePage(slug);
  if (!p) return { title: "State not found", robots: { index: false } };
  return resolveMetadata(`/mbbs-india/${slug}`, {
    title: `MBBS in ${p.state.name} 2026: ${p.colleges.length} Colleges, Counselling & Cutoffs`,
    description: snippet(p),
    keywords: `MBBS in ${p.state.name}, MBBS colleges in ${p.state.name}, ${p.state.name} NEET counselling, ${p.state.name} MBBS cutoff, government medical colleges ${p.state.name}`,
  });
}

/** What each kind of counselling is — said only where it holds everywhere. */
function explain(counselling: string, state: string): string {
  if (/all india/i.test(counselling))
    return "Run by MCC. 15% of the seats in government colleges, open to candidates from every state on their All India Rank.";
  if (/deemed/i.test(counselling)) return "Run by MCC. Deemed universities fill all their seats here, open to every state.";
  if (/esi/i.test(counselling)) return "ESIC colleges, with seats reserved for the wards of insured persons.";
  if (counselling.toLowerCase().startsWith(state.split(" ")[0].toLowerCase()))
    return `The state's own counselling — the remaining government seats and the private college seats in ${state}. Check the domicile rule before you count on it.`;
  return "A separate quota with its own eligibility.";
}

export default async function MBBSStatePage({ params }: Props) {
  const raw = slugOf(params.stateName);
  // Two states used to carry "&" in their slug, which also made the sitemap
  // invalid XML. They are "-and-" now; the old address redirects.
  if (raw.includes("&")) permanentRedirect(`/mbbs-india/${raw.replace(/&/g, "and")}`);
  // The CMS spelled it "Chattisgarh"; the state, and what people search, is "Chhattisgarh".
  if (raw in RENAMED) permanentRedirect(`/mbbs-india/${RENAMED[raw]}`);

  const p = await getStatePage(raw);
  if (!p) notFound();

  const name = p.state.name;
  const path = `/mbbs-india/${p.state.slug}`;
  const withRanks = p.colleges.filter((c) => c.rankRows > 0).length;
  const years = p.years.length ? p.years.join(" and ") : null;

  const faqs = [
    {
      question: `How many MBBS colleges are there in ${name}?`,
      answer:
        `We list ${p.colleges.length} MBBS colleges in ${name}` +
        (withRanks ? `, ${withRanks} of them with published NEET UG closing ranks` : "") +
        `. Each has its own page with the ranks it closed at, round by round.`,
    },
    ...(p.counsellings.length
      ? [
          {
            question: `Which counselling fills MBBS seats in ${name}?`,
            answer:
              `In the published results, MBBS seats in ${name} were filled through: ` +
              p.counsellings.map((c) => `${c.name} (${c.colleges} ${c.colleges === 1 ? "college" : "colleges"})`).join(", ") +
              `.`,
          },
        ]
      : []),
    {
      question: `What NEET rank do I need for MBBS in ${name}?`,
      answer:
        `It depends on the quota and your category — a state-quota seat and an All India Quota seat in the same college close at very different ranks. ` +
        `Enter your rank in the NEET college predictor to see every seat it reached in ${years ? `the ${years}` : "the last"} counselling.`,
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MBBS in India", path: "/mbbs-india" },
            { name: `MBBS in ${name}`, path },
          ]),
          webPage({ name: `MBBS in ${name}`, description: describe(p), path }),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `MBBS colleges in ${name}`,
            numberOfItems: p.colleges.length,
            itemListElement: p.colleges.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.name,
              url: `${SITE}/mbbs-india/colleges/${c.slug}`,
            })),
          },
          faqPage(faqs),
        ]}
      />

      {/* ------------------------------- hero ------------------------------- */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] opacity-50" aria-hidden="true" />
        <div className="container-custom relative py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-slate-400">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <Link href="/mbbs-india" className="hover:text-white">
              MBBS in India
            </Link>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <span className="text-slate-200">{name}</span>
          </nav>
          <h1 className="font-heading max-w-[24ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            MBBS in {name}: <span className="text-cyan-300">colleges and counselling</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">{describe(p)}</p>

          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "MBBS colleges", v: inr(p.colleges.length) },
              { k: "With closing ranks", v: inr(withRanks) },
              { k: "Counsellings", v: inr(p.counsellings.length) },
              { k: "Data years", v: years ?? "—" },
            ].map(({ k, v }) => (
              <div key={k}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="tnum mt-1 text-xl font-bold text-white md:text-2xl">{v}</dd>
              </div>
            ))}
          </dl>

          <Link
            href="/neet-college-predictor?course=mbbs"
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            <Search className="h-4 w-4" aria-hidden="true" /> Check which seats your rank reaches
          </Link>
        </div>
      </section>

      {/* --------------------------- counsellings --------------------------- */}
      {p.counsellings.length > 0 && (
        <section className="container-custom py-10 md:py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Who fills MBBS seats in {name}
          </h2>
          <p className="mt-2 max-w-[66ch] text-muted-foreground">
            Every counselling that allotted an MBBS seat in {name} in the published results
            {years ? ` for ${years}` : ""}, and how many of the state&apos;s colleges it covers.
          </p>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {p.counsellings.map((c) => (
              <li key={c.name} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="flex items-center gap-2 font-semibold text-foreground">
                    <Landmark className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {c.name}
                  </h3>
                  <span className="tnum shrink-0 text-sm text-muted-foreground">
                    {c.colleges} {c.colleges === 1 ? "college" : "colleges"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{explain(c.name, name)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------ colleges ----------------------------- */}
      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            MBBS colleges in {name}
          </h2>
          <p className="mt-2 max-w-[66ch] text-muted-foreground">
            Open a college for its closing ranks by quota and category, round by round.
          </p>
          {p.colleges.length === 0 ? (
            <p className="mt-6 text-muted-foreground">No MBBS college in {name} has published closing ranks in our data yet.</p>
          ) : (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {p.colleges.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/mbbs-india/colleges/${c.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
                  >
                    {/* No icons on these cards: three inline SVGs a card, repeated in
                        the RSC payload, made Uttar Pradesh's page 555 KB. */}
                    <span className="font-semibold leading-snug text-foreground group-hover:text-primary">{c.name}</span>
                    <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                      {c.city && <span>{c.city}</span>}
                      {c.collegeType && <span>{c.collegeType}</span>}
                      {c.establishedYear && <span>Est. {c.establishedYear}</span>}
                      {c.intake ? <span className="tnum">{c.intake} seats</span> : null}
                    </span>
                    <span className="mt-auto pt-3 text-[13px] font-semibold text-primary">
                      {c.rankRows > 0 ? "Closing ranks" : "College details"} <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* -------------------------------- faq -------------------------------- */}
      <section className="container-custom py-10 md:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          MBBS in {name}: common questions
        </h2>
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <LeadCapture
        level="ug"
        source={`MBBS in ${name}`}
        title={`Planning MBBS in ${name}?`}
        body="Tell us your rank and category. A counsellor will order your choices against the published closing ranks and stay with you through every round."
      />

      {/* --------------------------- other states --------------------------- */}
      <section className="container-custom border-t border-border py-10">
        <h2 className="font-heading text-xl font-bold text-foreground">MBBS in other states</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {p.others.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/mbbs-india/${s.slug}`}
                className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
