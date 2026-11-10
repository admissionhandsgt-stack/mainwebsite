import type { Metadata } from "next";
import { MessageCircle, Phone, Search } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { getLowRankClinical, type ClinicalRow, type Cut, type Family } from "@/lib/lowRankClinical";
import { getDeemedPg } from "@/lib/pgFeeQueries";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { CONTACT_INFO } from "@/lib/constants";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";

/**
 * /neet-pg-low-score-clinical-branches (2026-11-10). Searched as "low score clinical branches neet pg", "clinical branch
 * at low rank", "md medicine at low rank", "neet pg 300 marks clinical branch". Owner: "Just Eligible ko bhi badi clinical
 * branch jaise MD medicine… sab cheej khullam khulla nhi likhni, candidate ko counselor par depend karana hai".
 *
 * Every figure is a group figure from MCC's own results (lib/lowRankClinical.ts): the last rank admitted in a seat family
 * over three or more colleges, with the score it held. No college is named and no single college's rank appears: which
 * colleges, what fee and bond, which round — that is the counsellor's, and the page sends the reader there.
 */
export const revalidate = 3600;
const PATH = "/neet-pg-low-score-clinical-branches";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const lakh = (v: number | null | undefined) => (v == null ? "—" : `₹${(v / 1e5).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, "")} L`);

async function load() {
  const [d, deemed] = await Promise.all([getLowRankClinical().catch(() => null), getDeemedPg().catch(() => null)]);
  if (!d || !d.years.length) return null;
  const nowYear = d.years[d.years.length - 1];
  const year = d.runningRound ? d.years[0] : nowYear;
  const cut = (r: ClinicalRow | undefined, y: number, f: Family): Cut | undefined => r?.cuts[y]?.[f];
  const med = d.rows.find((r) => r.branch === "General Medicine");
  const deepest = (y: number) =>
    d.rows
      .map((r) => ({ r, c: cut(r, y, "deemed") }))
      .filter((x): x is { r: ClinicalRow; c: Cut } => !!x.c)
      .sort((a, b) => b.c.rank - a.c.rank);
  const deep = deepest(year);
  const deepNow = nowYear !== year ? deepest(nowYear) : [];
  const fee = deemed?.national.find((b) => /management/i.test(b.family));
  return { d, year, nowYear, med, deep, deepNow, cut, fee };
}

const scoreText = (c?: Cut) => (c?.score != null ? `${c.score}/${c.outOf}` : "—");

export async function generateMetadata(): Promise<Metadata> {
  const p = await load();
  const medC = p ? p.cut(p.med, p.year, "deemed") : undefined;
  const top = p?.deep[0];
  return resolveMetadata(PATH, {
    title: fitTitle(
      `Low Score Clinical Branches in NEET PG ${p?.nowYear ?? ""} (Rank & Marks)`.replace(" ()", ""),
      `NEET PG Low Score Clinical Branches ${p?.nowYear ?? ""}`.trim(),
      "NEET PG Low Score Clinical Branches",
    ),
    description: fitDescription(
      ...(p && medC && top
        ? [
            `MD General Medicine went to AIR ${n(medC.rank)} (score ${scoreText(medC)}) on deemed paid seats in ${p.year}; ${top.r.branch} to AIR ${n(top.c.rank)}. Every clinical branch, last rank and score, ${p.year}–${p.nowYear}.`,
            `MD General Medicine went to AIR ${n(medC.rank)} (score ${scoreText(medC)}) on deemed paid seats in ${p.year}. Every clinical branch with its last rank and score.`,
          ]
        : []),
      "Where MD Medicine, Surgery, Orthopaedics and every clinical branch went at a low NEET PG rank, with the score — from MCC's own results.",
    ),
    keywords:
      "low score clinical branches NEET PG, clinical branch at low rank, MD medicine low rank, NEET PG low score MD MS, clinical branch deemed university paid seat, NEET PG just qualified clinical branch",
  });
}

export default async function LowScoreClinicalPage() {
  const p = await load();
  const medDeemed = p ? p.cut(p.med, p.year, "deemed") : undefined;
  const medAiq = p ? p.cut(p.med, p.year, "aiq") : undefined;
  const top = p?.deep[0];
  const topNow = p?.deepNow[0];
  const tokens = {
    year: p?.year,
    now_year: p?.nowYear,
    med_rank: n(medDeemed?.rank),
    med_score: scoreText(medDeemed),
    deep_branch: top?.r.branch,
    deep_rank: n(top?.c.rank),
    deep_score: scoreText(top?.c),
    ranked: n(p?.d.ranked[p?.year ?? 0]),
    deemed_fee: p?.fee?.p10 && p.fee.p90 ? `${lakh(p.fee.p10)} – ${lakh(p.fee.p90)}` : "more than a government seat",
  };
  const [copy, body, heroImage] = await Promise.all([
    pageCopy("page.pg_low_clinical.hero", tokens),
    pageCopy("page.pg_low_clinical.body", tokens),
    pageHeroImage("page.pg_low_clinical.hero", "page.pg_branch.hero"),
  ]);
  const wa = `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(body.wa_text)}`;
  const routes = body.routes
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((x) => x[0] && x[1]);
  const points = body.counsel_points.split("\n").map((x) => x.trim()).filter(Boolean);
  const answerReady = !!(medDeemed && top);

  const faqs = p && medDeemed && top
    ? [
        {
          question: "Can I get MD General Medicine at a low rank in NEET PG?",
          answer: `In ${p.year}, the last MD General Medicine seat in deemed universities' paid quota went to AIR ${n(medDeemed.rank)} (score ${scoreText(medDeemed)}), over ${medDeemed.colleges} colleges${
            medAiq ? `; on government seats in the All India Quota (open category) it closed at AIR ${n(medAiq.rank)}` : ""
          }. State management and NRI quotas, and the later rounds, add more seats. Which colleges, and at what fee, depends on your rank, category and state — a counsellor can list them for you.`,
        },
        {
          question: "Which clinical branch goes to the lowest NEET PG rank?",
          answer: `On deemed universities' paid seats in ${p.year}: ${p.deep
            .slice(0, 4)
            .map((x) => `${x.r.branch} (AIR ${n(x.c.rank)})`)
            .join(", ")}. On government seats the order is different and every branch closes far earlier.`,
        },
        {
          question: "Is a just-qualifying NEET PG score enough for a clinical branch?",
          answer: `In ${p.year} the deepest clinical seat went at a score of ${scoreText(top.c)} (AIR ${n(top.c.rank)}, ${top.r.branch}, a deemed paid seat). Seats that deep are paid seats and come mostly in the later rounds, so it is possible — but it needs a budget, the right round and a list of colleges made for your rank.`,
        },
        {
          question: "Why do paid seats go to such low ranks?",
          answer: `Deemed universities' paid seats cost far more than government seats${p.fee?.median ? ` — ${lakh(p.fee.median)} a year in the middle` : ""} — so many higher-ranked candidates pass on them. As the rounds go on they fall to candidates further down the list who can pay.`,
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "Low score clinical branches", path: PATH },
          ]),
          webPage({ name: "NEET PG low score clinical branches", description: answerReady ? copy.answer : copy.subtitle, path: PATH }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "Low score clinical branches" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={answerReady && copy.answer ? copy.answer : copy.subtitle}
        image={heroImage}
        topic="branch"
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_low_clinical"
        source={copy.source}
        insights={
          p && top
            ? [
                { icon: "down" as const, label: `Deepest clinical seat, ${p.year}`, value: `AIR ${n(top.c.rank)}`, note: `${top.r.branch} · score ${scoreText(top.c)}` },
                ...(medAiq ? [{ icon: "college" as const, label: `Govt seats, MD Medicine (open), ${p.year}`, value: `AIR ${n(medAiq.rank)}`, note: "All India Quota" }] : []),
                ...(topNow ? [{ icon: "up" as const, label: `${p.nowYear} ${p.d.runningRound ?? ""} so far`.replace("  ", " "), value: `AIR ${n(topNow.c.rank)}`, note: `${topNow.r.branch} · score ${scoreText(topNow.c)}` }] : []),
                { icon: "people" as const, label: `Ranked in ${p.year}`, value: n(p.d.ranked[p.year]), note: "NBEMS result" },
              ]
            : undefined
        }
      />

      {p && (
        <section className="container-custom py-10 md:py-14">
          <SectionHead icon="list" eyebrow={`${p.d.rows.length} clinical branches`} title={body.table_title} intro={body.table_intro} />
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="dt w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Branch</th>
                  <th className="text-right">Govt seats, open · {p.year}</th>
                  <th className="text-right">Deemed paid · {p.year}</th>
                  {p.nowYear !== p.year && <th className="text-right">Deemed paid · {p.nowYear} {p.d.runningRound ?? ""}</th>}
                  <th className="text-right">DNB, open · {p.year}</th>
                </tr>
              </thead>
              <tbody>
                {p.d.rows.map((r) => {
                  const cell = (c?: Cut) =>
                    c ? (
                      <>
                        <span className="tnum font-semibold text-foreground">AIR {n(c.rank)}</span>
                        <span className="block text-xs text-muted-foreground">score {scoreText(c)}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    );
                  return (
                    <tr key={r.branch}>
                      <td>
                        {r.slug ? (
                          <Link href={`/md-ms-india/branches/${r.slug}`} className="font-semibold text-primary-strong hover:underline">
                            {r.branch}
                          </Link>
                        ) : (
                          r.branch
                        )}
                      </td>
                      <td className="text-right">{cell(p.cut(r, p.year, "aiq"))}</td>
                      <td className="text-right">{cell(p.cut(r, p.year, "deemed"))}</td>
                      {p.nowYear !== p.year && <td className="text-right">{cell(p.cut(r, p.nowYear, "deemed"))}</td>}
                      <td className="text-right">{cell(p.cut(r, p.year, "dnb"))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The last rank admitted in each seat family over three or more colleges, from MCC&apos;s results; deemed paid seats have no
            category reservation. State counselling quotas are not in this table — ask a counsellor for your state&apos;s.
          </p>
        </section>
      )}

      {routes.length > 0 && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="branch" eyebrow="Four routes" title={body.routes_title} />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {routes.map(([t, d]) => (
                <div key={t} className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-semibold text-foreground">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container-custom py-10 md:py-14">
        <div className="rounded-3xl border border-primary/20 bg-primary-soft p-6 md:p-8">
          <h2 className="font-heading text-2xl font-bold text-foreground">{body.counsel_title}</h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {points.map((x) => (
              <li key={x} className="flex gap-2 text-[15px] leading-relaxed text-foreground">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-strong" />
                {x}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={wa} target="_blank" rel="noopener noreferrer" data-placement="low_clinical_wa" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white">
              <MessageCircle className="h-4 w-4" aria-hidden /> Ask on WhatsApp
            </a>
            <a href={`tel:${CONTACT_INFO.phone}`} data-placement="low_clinical_call" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-5 font-semibold text-foreground">
              <Phone className="h-4 w-4" aria-hidden /> Call a counsellor
            </a>
            <Link href="/neet-college-predictor?course=pg" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-5 font-semibold text-foreground">
              <Search className="h-4 w-4" aria-hidden /> Check my rank free
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No one can promise a seat: counselling allots it. We tell you where your rank stood last year and how to fill your choices.</p>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="help" eyebrow="FAQ" title={body.faq_title} />
            <div className="mt-6 space-y-3">
              {faqs.map((f) => (
                <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
                  <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
                </details>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Also:{" "}
              <Link href="/neet-pg-cutoff" className="font-semibold text-primary-strong hover:underline">NEET PG cut off branch wise</Link> ·{" "}
              <Link href="/neet-pg-marks-vs-rank" className="font-semibold text-primary-strong hover:underline">marks vs rank</Link> ·{" "}
              <Link href="/md-ms-india/deemed-universities" className="font-semibold text-primary-strong hover:underline">deemed university PG fees</Link> ·{" "}
              <Link href="/management-quota" className="font-semibold text-primary-strong hover:underline">management quota</Link>
            </p>
          </div>
        </section>
      )}

      <LeadCapture level="pg" source="Low score clinical branches page" title={body.lead_title} body={body.lead_body} />
      <TelegramJoin placement="pg_low_clinical" />
    </main>
  );
}
