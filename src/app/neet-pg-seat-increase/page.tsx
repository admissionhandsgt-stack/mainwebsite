import type { Metadata } from "next";
import { Info } from "lucide-react";
import Link from "@/components/ui/Link";
import { resolveMetadata } from "@/lib/content";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { getSeatIncrease } from "@/lib/seatIncrease";
import { branchSlug } from "@/lib/branchSlug";
import { MATRIX_LABEL } from "@/lib/pgSeatData";
import { pairs } from "@/components/counsel/CounselBlocks";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import SectionHead from "@/components/ui/SectionHead";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import LeadCapture from "@/components/lead/LeadCapture";
import { FaqList } from "@/components/counsel/CounselBlocks";

/**
 * "NEET PG seat increase 2026" / "new pg seats 2026" / "nmc approved pg seats" (2026-11-12, the journey study): the seats MCC
 * added to its matrix after first publishing it (lib/seatIncrease.ts, only a round's latest revision), by matrix, branch,
 * state and college, and NMC's register of approved PG seats. The address has no year; next year's additions take it over.
 * Words: Admin → Content → "Page: NEET PG seat increase".
 */

const PATH = "/neet-pg-seat-increase";
const n = (v: number) => v.toLocaleString("en-IN");
const NMC_LABEL: Record<string, string> = { MD: "MD", MS: "MS", Diploma: "Diploma", DM: "DM", "M.Ch.": "M.Ch." };
const nice = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";

async function load() {
  const s = await getSeatIncrease();
  const nmcMdms = s?.nmc.filter((x) => x.type === "MD" || x.type === "MS").reduce((a, x) => a + x.seats, 0);
  const tokens = {
    year: s?.year,
    added: s ? n(s.added) : undefined,
    base: s ? n(s.base) : undefined,
    total: s ? n(s.total) : undefined,
    top_branch: s?.byBranch[0]?.branch,
    top_branch_added: s?.byBranch[0] ? n(s.byBranch[0].added) : undefined,
    top_state: s?.byState[0]?.state,
    top_state_added: s?.byState[0] ? n(s.byState[0].added) : undefined,
    colleges: s ? n(new Set(s.byCollege.map((c) => c.name)).size) : undefined,
    nmc_mdms: nmcMdms ? n(nmcMdms) : undefined,
    nmc_date: nice(s?.nmcUpdated ?? null) || undefined,
  };
  const c = await pageCopy("page.pg_seat_increase", tokens);
  return { s, c };
}

export async function generateMetadata(): Promise<Metadata> {
  const { c } = await load();
  return resolveMetadata(PATH, {
    title: fitTitle(c.seo_title, "NEET PG Seat Increase: New Seats Added", "NEET PG Seat Increase"),
    description: fitDescription(c.seo_description, c.subtitle),
    keywords: "neet pg seat increase 2026, neet pg newly added seats, new pg seats 2026, nmc approved pg seats, increase in neet pg seats, mcc added seats round 2",
  });
}

export default async function SeatIncreasePage() {
  const [{ s, c }, heroImage] = await Promise.all([load(), pageHeroImage("page.pg_seat_increase.hero", "page.pg_seat_matrix.hero")]);
  const faqs = pairs(c.faqs).map(([question, answer]) => ({ question, answer }));

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET PG seat matrix", path: "/neet-pg-seat-matrix" },
            { name: "Seat increase", path: PATH },
          ]),
          webPage({ name: "NEET PG seat increase", description: c.subtitle, path: PATH }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Seat matrix", href: "/neet-pg-seat-matrix" }, { label: "Seat increase" }]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={s?.added ? c.accent : undefined}
        subtitle={s?.added ? c.answer : c.subtitle}
        image={heroImage}
        topic="chart"
        cta={{ label: c.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_seat_increase"
        source={c.source}
        visual={
          s?.byBranch.length ? (
            <HeroBars
              title={c.visual_title}
              caption={c.visual_caption}
              rows={s.byBranch.slice(0, 8).map((b) => ({ label: b.branch, value: b.added, display: `+${n(b.added)}`, note: `${b.colleges} colleges` }))}
            />
          ) : undefined
        }
        insights={
          s
            ? [
                { icon: "up" as const, label: c.insight_added, value: `+${n(s.added)}` },
                { icon: "compare" as const, label: c.insight_total, value: n(s.total), note: `${n(s.base)} + ${n(s.added)}` },
                ...(s.byState[0] ? [{ icon: "authority" as const, label: c.insight_state, value: s.byState[0].state, note: `+${n(s.byState[0].added)}` }] : []),
                ...(s.byBranch[0] ? [{ icon: "spark" as const, label: c.insight_branch, value: s.byBranch[0].branch, note: `+${n(s.byBranch[0].added)}` }] : []),
              ]
            : undefined
        }
      />

      {!s ? (
        <section className="container-custom py-14">
          <p className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-muted-foreground">{c.empty}</p>
        </section>
      ) : (
        <>
          <section className="container-custom py-10 md:py-14">
            <SectionHead icon="chart" eyebrow={c.matrix_eyebrow} title={c.matrix_title} intro={c.matrix_intro} />
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="dt w-full min-w-[560px] text-left text-[14px]">
                <thead>
                  <tr>
                    <th scope="col">{c.col_matrix}</th>
                    <th scope="col" className="text-right">{c.col_base}</th>
                    <th scope="col" className="text-right">{c.col_added}</th>
                    <th scope="col" className="text-right">{c.col_total}</th>
                  </tr>
                </thead>
                <tbody>
                  {s.byMatrix.map((r) => (
                    <tr key={r.matrix}>
                      <th scope="row" className="font-semibold">{MATRIX_LABEL[r.matrix] ?? r.matrix}</th>
                      <td className="tnum text-right">{n(r.base)}</td>
                      <td className="tnum text-right font-semibold text-primary-strong dark:text-primary">{r.added ? `+${n(r.added)}` : "—"}</td>
                      <td className="tnum text-right">{n(r.base + r.added)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <th scope="row">{c.row_total}</th>
                    <td className="tnum text-right">{n(s.base)}</td>
                    <td className="tnum text-right text-primary-strong dark:text-primary">+{n(s.added)}</td>
                    <td className="tnum text-right">{n(s.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {s.notices.length > 0 && (
              <p className="mt-3 flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {c.notices_note}{" "}
                  {s.notices.map((x, i) => (
                    <span key={x.url}>
                      {i > 0 && " · "}
                      <a href={x.url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-primary">
                        {x.title}
                      </a>
                    </span>
                  ))}
                </span>
              </p>
            )}
          </section>

          <section className="border-y border-border bg-surface-1 py-10 md:py-14">
            <div className="container-custom grid gap-10 lg:grid-cols-2">
              <div>
                <SectionHead icon="branch" eyebrow={c.branch_eyebrow} title={c.branch_title} />
                <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
                  <table className="dt w-full text-left text-[14px]">
                    <thead>
                      <tr>
                        <th scope="col">{c.col_branch}</th>
                        <th scope="col" className="text-right">{c.col_added}</th>
                        <th scope="col" className="text-right">{c.col_colleges}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.byBranch.slice(0, 20).map((b) => (
                        <tr key={b.branch}>
                          <td>
                            {b.slug ? (
                              <Link href={`/md-ms-india/branches/${branchSlug(b.branch)}`} className="hover:text-primary hover:underline">
                                {b.branch}
                              </Link>
                            ) : (
                              b.branch
                            )}
                          </td>
                          <td className="tnum text-right font-semibold">+{n(b.added)}</td>
                          <td className="tnum text-right">{b.colleges}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <SectionHead icon="map" eyebrow={c.state_eyebrow} title={c.state_title} />
                <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
                  <table className="dt w-full text-left text-[14px]">
                    <thead>
                      <tr>
                        <th scope="col">{c.col_state}</th>
                        <th scope="col" className="text-right">{c.col_added}</th>
                        <th scope="col" className="text-right">{c.col_colleges}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.byState.map((r) => (
                        <tr key={r.state}>
                          <td>{r.state}</td>
                          <td className="tnum text-right font-semibold">+{n(r.added)}</td>
                          <td className="tnum text-right">{r.colleges}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <section className="container-custom py-10 md:py-14">
            <SectionHead icon="college" eyebrow={c.college_eyebrow} title={c.college_title} intro={c.college_intro} />
            <ol className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {s.byCollege.map((x, i) => (
                <li key={`${x.name}-${i}`} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <span className="min-w-0">
                    {x.slug ? (
                      <Link href={`/md-ms-india/colleges/${x.slug}`} className="font-semibold text-foreground hover:text-primary hover:underline">
                        {x.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">{x.name}</span>
                    )}
                    <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                      {x.state ? `${x.state} · ` : ""}
                      {x.branches} branches
                    </span>
                  </span>
                  <span className="tnum shrink-0 font-bold text-primary-strong dark:text-primary">+{n(x.added)}</span>
                </li>
              ))}
            </ol>
          </section>

          {s.nmc.length > 0 && (
            <section className="border-t border-border bg-surface-1 py-10 md:py-14">
              <div className="container-custom">
                <SectionHead icon="authority" eyebrow={c.nmc_eyebrow} title={c.nmc_title} intro={c.nmc_intro} />
                <ul className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {s.nmc.map((x) => (
                    <li key={x.type} className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{NMC_LABEL[x.type] ?? x.type}</p>
                      <p className="tnum mt-1 font-heading text-2xl font-extrabold text-foreground">{n(x.seats)}</p>
                      <p className="mt-0.5 text-[12.5px] text-muted-foreground">{n(x.colleges)} colleges</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[14px] text-muted-foreground">
                  <Link href="/neet-pg-statistics" className="font-semibold text-primary-strong hover:underline dark:text-primary">{c.stats_link}</Link>
                  {" · "}
                  <Link href="/neet-pg-seat-matrix" className="font-semibold text-primary-strong hover:underline dark:text-primary">{c.matrix_link}</Link>
                </p>
              </div>
            </section>
          )}

          <DataPageCounsel kind="cutoff" name={c.counsel_topic} placement="pg_seat_increase" />
          {faqs.length > 0 && <FaqList title={c.faq_title} faqs={faqs} />}
        </>
      )}
      <LeadCapture level="pg" source="NEET PG seat increase" />
    </main>
  );
}
