import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { resolveMetadata } from "@/lib/content";
import { getNewColleges, type NewCollegesYear } from "@/lib/newColleges";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { fitTitle, fitDescription } from "@/lib/seoTitle";
import { readableDate } from "@/lib/pageDates";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import CollegeFaq from "@/components/colleges/CollegeFaq";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import DataTools from "@/components/ui/DataTools";
import { toolLabels } from "@/lib/dataToolLabels";

/**
 * New medical colleges (2026-11-11): every college NMC permitted for the academic year in progress, from NMC's own
 * register (lib/newColleges.ts) — state, government or private, MBBS seats, the LoP date, and our page for it. The
 * address carries no year, so next year's list takes it over; the title and H1 carry the year.
 * Words: Admin → Content → "Page: new medical colleges".
 */
export const revalidate = 3600;
const PATH = "/mbbs-india/new-medical-colleges";
const inr = (n: number) => n.toLocaleString("en-IN");
const session = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;

async function load() {
  const d = await getNewColleges();
  const now = d.now;
  const top = now?.byState[0];
  const copy = await pageCopy("page.new_colleges", {
    year: now?.year,
    session: now ? session(now.year) : undefined,
    prev: d.prev?.year,
    n: now ? inr(now.colleges.length) : undefined,
    seats: now ? inr(now.seats) : undefined,
    govt: now?.govt.colleges,
    govt_seats: now ? inr(now.govt.seats) : undefined,
    private: now?.private.colleges,
    private_seats: now ? inr(now.private.seats) : undefined,
    top_state: top?.state,
    top_n: top?.colleges,
    date: d.nmcDate ? readableDate(d.nmcDate.slice(0, 10)) : undefined,
  });
  return { d, now, copy };
}

export async function generateMetadata(): Promise<Metadata> {
  const { now } = await load();
  const y = now?.year ?? "";
  const n = now ? inr(now.colleges.length) : "";
  const seats = now ? inr(now.seats) : "";
  return resolveMetadata(PATH, {
    title: fitTitle(
      `New Medical Colleges ${y}: ${n} Colleges, ${seats} MBBS Seats (NMC List)`,
      `New Medical Colleges ${y}: ${n} Colleges, ${seats} MBBS Seats`,
      `New Medical Colleges ${y} in India`,
    ),
    description: fitDescription(
      `NMC's list of new medical colleges for ${now ? session(now.year) : y}: ${n} colleges with ${seats} MBBS seats — state wise, government and private, with each college's seats and Letter of Permission date.`,
      `New medical colleges ${y}: ${n} colleges, ${seats} MBBS seats, state wise, from NMC's register.`,
    ),
    keywords: `new medical colleges ${y}, new mbbs colleges ${y}, new medical colleges in india ${y}, nmc new medical colleges, new government medical colleges ${y}`,
  });
}

const key = (x: string | null | undefined) => (x ?? "").toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

function YearTable({ y, compact = false, id }: { y: NewCollegesYear; compact?: boolean; id?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table id={id} className="dt w-full min-w-[640px] text-[14px]">
        <thead>
          <tr>
            <th className="text-left">College</th>
            <th className="text-left">State</th>
            <th className="text-left">Type</th>
            <th className="text-right">MBBS seats</th>
            {!compact && <th className="text-left">LoP granted</th>}
          </tr>
        </thead>
        <tbody>
          {y.colleges.map((c) => (
            <tr
              key={c.code}
              data-row=""
              data-f-state={key(c.state)}
              data-f-type={key(c.management)}
              data-s-name={c.name.toLowerCase()}
              {...(c.seats ? { "data-s-seats": c.seats } : {})}
            >
              <td>
                {c.slug ? (
                  <Link href={`/mbbs-india/colleges/${c.slug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                    {c.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-foreground">{c.name}</span>
                )}
                {!compact && c.university && <div className="text-[12.5px] text-muted-foreground">{c.university}</div>}
              </td>
              <td>
                {c.stateSlug ? (
                  <Link href={`/mbbs-india/${c.stateSlug}`} className="hover:text-primary hover:underline">
                    {c.state}
                  </Link>
                ) : (
                  c.state
                )}
              </td>
              <td>{c.management}</td>
              <td className="tnum text-right">{inr(c.seats)}</td>
              {!compact && <td className="tnum">{c.lop ?? "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function NewMedicalColleges() {
  const { d, now, copy } = await load();
  const [image, labels] = await Promise.all([pageHeroImage("page.new_colleges.hero", "page.ug_state.hero"), toolLabels("fees_search")]);
  const faqs = now
    ? [
        {
          question: `How many new medical colleges are there in ${now.year}?`,
          answer: `NMC has permitted ${inr(now.colleges.length)} new medical colleges for ${session(now.year)}, with ${inr(now.seats)} MBBS seats in all: ${now.govt.colleges} government (${inr(now.govt.seats)} seats) and ${now.private.colleges} private (${inr(now.private.seats)} seats).${d.prev ? ` In ${d.prev.year} it permitted ${inr(d.prev.colleges.length)} (${inr(d.prev.seats)} seats).` : ""}`,
        },
        ...(now.byState[0]
          ? [
              {
                question: `Which state got the most new medical colleges in ${now.year}?`,
                answer: `${now.byState
                  .slice(0, 3)
                  .map((s) => `${s.state}: ${s.colleges} (${inr(s.seats)} MBBS seats)`)
                  .join("; ")}.`,
              },
            ]
          : []),
        {
          question: `How many new government medical colleges are there in ${now.year}?`,
          answer: now.govt.colleges
            ? `${now.govt.colleges} new government medical colleges with ${inr(now.govt.seats)} MBBS seats: ${now.colleges
                .filter((c) => /government/i.test(c.management))
                .map((c) => `${c.name} (${c.state}, ${c.seats})`)
                .join("; ")}.`
            : `None of the new colleges NMC permitted for ${session(now.year)} is a government college.`,
        },
        {
          question: "Is a new medical college a safe choice?",
          answer:
            "A new college admits its first batch under a Letter of Permission, which NMC renews each year after inspecting the hospital and faculty, until the first batch finishes and the MBBS course is recognised. It has no closing rank of its own yet. Check its status on NMC's register and its fee before you fill it, and place it in your order against colleges with a record.",
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MBBS in India", path: "/mbbs-india" },
            { name: "New medical colleges", path: PATH },
          ]),
          webPage({ name: `New medical colleges ${now?.year ?? ""}`, description: copy.subtitle, path: PATH, ...(d.nmcDate ? { dateModified: d.nmcDate.slice(0, 10) } : {}) }),
          ...(faqs.length ? [faqPage(faqs)] : []),
          ...(now
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "ItemList",
                  name: `New medical colleges ${now.year}`,
                  numberOfItems: now.colleges.length,
                  itemListElement: now.colleges.map((c, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    name: c.name,
                    ...(c.slug ? { url: `https://www.admissionhands.com/mbbs-india/colleges/${c.slug}` } : {}),
                  })),
                },
              ]
            : []),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MBBS in India", href: "/mbbs-india" }, { label: "New medical colleges" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={now ? (copy.answer ? <><b className="text-foreground">{copy.answer}</b> {copy.subtitle}</> : copy.subtitle) : "NMC's list of new colleges for this year is not out yet."}
        stats={
          now
            ? [
                { label: "New colleges", value: inr(now.colleges.length), note: d.prev ? `${inr(d.prev.colleges.length)} in ${d.prev.year}` : undefined },
                { label: "MBBS seats", value: inr(now.seats), note: d.prev ? `${inr(d.prev.seats)} in ${d.prev.year}` : undefined },
                { label: "Government", value: `${now.govt.colleges}`, note: `${inr(now.govt.seats)} seats` },
              ]
            : []
        }
        cta={{ label: "Check your MBBS chances", href: "/neet-college-predictor?course=mbbs" }}
        telegram="hero_new_colleges"
        source={copy.source}
        image={image}
        topic="college"
        visual={
          now ? (
            <HeroBars
              title={copy.states_title}
              rows={now.byState.slice(0, 6).map((s) => ({ label: s.state, value: s.seats, display: `${s.colleges} · ${inr(s.seats)} seats` }))}
            />
          ) : undefined
        }
      />

      {now && (
        <div className="container-custom space-y-12 py-10 md:py-14">
          <section aria-labelledby="by-state">
            <h2 id="by-state" className="font-heading text-2xl font-bold text-foreground">
              {copy.states_title}
            </h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
              <table className="dt w-full min-w-[480px] text-[14px]">
                <thead>
                  <tr>
                    <th className="text-left">State</th>
                    <th className="text-right">New colleges</th>
                    <th className="text-right">Government</th>
                    <th className="text-right">MBBS seats</th>
                  </tr>
                </thead>
                <tbody>
                  {now.byState.map((s) => (
                    <tr key={s.state}>
                      <td>
                        {s.stateSlug ? (
                          <Link href={`/mbbs-india/${s.stateSlug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                            {s.state}
                          </Link>
                        ) : (
                          s.state
                        )}
                      </td>
                      <td className="tnum text-right">{s.colleges}</td>
                      <td className="tnum text-right">{s.govt}</td>
                      <td className="tnum text-right">{inr(s.seats)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="every">
            <h2 id="every" className="font-heading text-2xl font-bold text-foreground">
              {copy.list_title}
            </h2>
            {now.colleges.length >= 8 && (
              <DataTools
                id="new-college-tools"
                className="mt-4"
                targets={["new-colleges"]}
                total={now.colleges.length}
                placement="new_medical_colleges"
                labels={labels}
                chips={[
                  {
                    key: "type",
                    label: "Type",
                    options: [...new Set(now.colleges.map((c) => c.management).filter(Boolean))].map((m) => ({ value: key(m), label: m })),
                  },
                  {
                    key: "state",
                    label: "State",
                    select: true,
                    options: [...new Set(now.colleges.map((c) => c.state).filter(Boolean))].sort().map((x) => ({ value: key(x), label: x })),
                  },
                ]}
                sorts={[
                  { key: "seats", label: "Most MBBS seats first", dir: "desc" },
                  { key: "name", label: "College, A–Z", text: true },
                ]}
              />
            )}
            <div className="mt-4">
              <YearTable y={now} id="new-colleges" />
            </div>
            <p className="mt-3 max-w-[80ch] text-[13.5px] leading-relaxed text-muted-foreground">{copy.list_note}</p>
          </section>

          {d.raised.length > 0 && (
            <section aria-labelledby="raised">
              <h2 id="raised" className="font-heading text-xl font-bold text-foreground">
                {copy.raised_title}
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {d.raised.map((r) => (
                  <li key={`${r.name}|${r.state}`} className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-[14px]">
                    {r.slug ? (
                      <Link href={`/mbbs-india/colleges/${r.slug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                        {r.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">{r.name}</span>
                    )}
                    <span className="text-muted-foreground">
                      {" "}
                      · {r.state} · <span className="tnum">{r.from} → {r.to}</span> seats
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {d.prev && (
            <section aria-labelledby="prev">
              <h2 id="prev" className="font-heading text-xl font-bold text-foreground">
                {copy.prev_title}
              </h2>
              <p className="mt-1 text-[14px] text-muted-foreground">
                {inr(d.prev.colleges.length)} colleges, {inr(d.prev.seats)} MBBS seats — {d.prev.govt.colleges} government, {d.prev.private.colleges} private.
              </p>
              <div className="mt-4">
                <YearTable y={d.prev} compact />
              </div>
            </section>
          )}

          <CollegeFaq faqs={faqs.map((f) => ({ q: f.question, a: f.answer }))} />
        </div>
      )}

      <LeadCapture level="ug" source="New medical colleges page" title={copy.counsel_title} body={copy.counsel_body} />
      <TelegramJoin placement="new_colleges" />
    </main>
  );
}
