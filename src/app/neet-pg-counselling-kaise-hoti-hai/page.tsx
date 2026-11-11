import type { Metadata } from "next";
import { LinkCards } from "@/components/counsel/CounselBlocks";
import { ExternalLink, Info } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { getPgProcessContent } from "@/lib/pgProcessContent";
import { getUpgrades, liveChoiceRound, PG_COUNSELLING_YEAR as YEAR } from "@/lib/pgRoundNow";
import { getSeatMatrixOverview, MATRIX_LABEL } from "@/lib/pgSeatData";
import { getCounselPgStates } from "@/lib/counselStates";
import { DEPOSITS, SOURCES } from "@/lib/choiceFillingRules";
import { exactInr } from "@/lib/chance";
import { faqLines, hinglishFaqs } from "@/lib/hinglishFaq";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroFacts from "@/components/hero/HeroFacts";
import SectionHead from "@/components/ui/SectionHead";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import TelegramRoundAlert from "@/components/engage/TelegramRoundAlert";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import ScheduleRevisionNote from "@/components/mcc/ScheduleRevisionNote";

/**
 * "NEET PG counselling kaise hoti hai" (2026-11-11; owner: "bnao jo nhi bana hai"): the beginner's overview in
 * Hinglish — the words families and doctors use when they ask it — beside the English /neet-pg-process and
 * /neet-pg-choice-filling, which hold the detail and are linked, not copied. Rules only from lib/choiceFillingRules.ts
 * (MCC's documents, cited at the foot); dates from the admin's pg_schedule; seat counts from MCC's matrix; upgrade counts
 * from MCC's results. Every word: Admin → Content → "Page: NEET PG counselling kaise hoti hai (Hinglish)".
 * The page is en-IN (Latin-script Hinglish is read by Google as English) and has no hreflang twin.
 */

const PATH = "/neet-pg-counselling-kaise-hoti-hai";
const n = (v: number) => v.toLocaleString("en-IN");
const rows = (t: string) =>
  t
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((x) => x[0] && x[1]);

export async function generateMetadata(): Promise<Metadata> {
  const live = await liveChoiceRound().catch(() => null);
  return resolveMetadata(PATH, {
    title: fitTitle(
      "NEET PG Counselling Kaise Hoti Hai: Rounds, Upgrade, Free Exit",
      "NEET PG Counselling Kaise Hoti Hai: Rounds & Upgrade",
      "NEET PG Counselling Kaise Hoti Hai",
    ),
    description: fitDescription(
      ...(live?.filling
        ? [
            `NEET PG counselling Hinglish me: MCC aur state counselling, choice filling, Freeze/Float, upgrade, free exit. Abhi ${live.label}: choice filling ${live.filling}.`,
          ]
        : []),
      "NEET PG counselling Hinglish me: MCC aur state counselling, choice filling aur locking, round 1-3, free exit, Freeze/Float, upgrade aur seat chhodne ke rules, MCC ke notice se.",
    ),
    keywords:
      "neet pg counselling kaise hoti hai, neet pg counselling kaise kare, neet pg counselling process hindi, free exit kya hai, freeze float kya hota hai, upgrade kaise hota hai neet pg, aiq vs state quota, choice filling kaise kare",
  });
}

export default async function NeetPgKaisePage() {
  const [live, { schedule }, upgrades, matrix, states, heroImage] = await Promise.all([
    liveChoiceRound().catch(() => null),
    getPgProcessContent(),
    getUpgrades().catch((): Awaited<ReturnType<typeof getUpgrades>> => []),
    getSeatMatrixOverview().catch(() => null),
    getCounselPgStates().catch((): Awaited<ReturnType<typeof getCounselPgStates>> => []),
    pageHeroImage("page.pg_kaise.hero", "page.pg_choice_filling.hero", "page.pg_process.hero"),
  ]);
  const last = upgrades.find((u) => u.round === "Round 2")?.year;
  const r2 = upgrades.find((u) => u.year === last && u.round === "Round 2");
  const c = await pageCopy("page.pg_kaise", {
    year: YEAR,
    round: live?.label,
    filling: live?.filling,
    locking: live?.locking ?? "MCC ke schedule ke hisaab se",
    upgraded: r2 ? n(r2.upgraded) : undefined,
    allotted: r2 ? n(r2.allotted) : undefined,
    last_year: r2?.year,
  });
  const steps = rows(c.steps);
  const rounds = rows(c.rounds);
  const dates = schedule.filter((s) => s.choiceFilling || s.choiceLocking || s.result || s.reporting);
  // The page's own questions first, then the choice-filling ones every guide shares.
  const faqs = [...faqLines(c.faq, {}), ...(await hinglishFaqs("choice_filling"))];
  const subtitle = live?.filling && c.answer_live ? c.answer_live : c.subtitle;

  return (
    <main className="min-h-screen bg-background" lang="en-IN">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET PG counselling process", path: "/neet-pg-process" },
            { name: "NEET PG counselling kaise hoti hai", path: PATH },
          ]),
          webPage({ name: "NEET PG counselling kaise hoti hai", description: c.subtitle, path: PATH }),
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "NEET PG process", href: "/neet-pg-process" }, { label: "Counselling kaise hoti hai" }]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={c.accent}
        subtitle={subtitle}
        image={heroImage}
        topic="document"
        cta={{ label: c.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_kaise"
        source={c.source}
        visual={
          <HeroFacts
            title="Seat chhodna, round by round"
            facts={rounds.map((r) => ({ label: r[0], value: r[0] === "Round 1" ? "Free exit" : r[0] === "Round 2" ? "Deposit forfeit" : r[0] === "Round 3" ? "Resign nahi" : "Join ya forfeit" }))}
            footnote="MCC ka 2026 bulletin; latest notice hi final."
          />
        }
        insights={[
          ...(live ? [{ icon: "spark" as const, label: `Abhi ${live.label}`, value: live.filling ?? "dates jald", note: live.locking ? `locking ${live.locking}` : "MCC ka notice dekhein" }] : []),
          ...(r2 ? [{ icon: "up" as const, label: `Round 2 upgrades, ${r2.year}`, value: n(r2.upgraded), note: `${n(r2.allotted)} allotments me se` }] : []),
          ...(matrix ? [{ icon: "college" as const, label: `MCC ki seats, ${matrix.year}`, value: n(matrix.total), note: "AIQ, deemed, central, DNB" }] : []),
          { icon: "authority" as const, label: "AIQ security deposit", value: "₹25,000", note: "UR/EWS; reserved ₹10,000; deemed ₹2 lakh" },
        ]}
      />

      {/* -------------------- the steps -------------------- */}
      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="route" eyebrow="Step by step" title={c.steps_title} />
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map(([title, text], i) => (
            <li key={title} className="rounded-2xl border border-border bg-card p-5">
              <p className="flex items-center gap-2.5 font-heading font-bold text-foreground">
                <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-soft text-[13px] font-bold text-primary-strong">{i + 1}</span>
                {title}
              </p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------- who fills which seat -------------------- */}
      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <SectionHead icon="authority" eyebrow="AIQ aur state" title={c.quotas_title} intro={c.quotas_intro} />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {matrix && (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="dt w-full text-left text-sm">
                  <caption className="px-4 pt-3 text-left text-[13px] text-muted-foreground">MCC ka NEET PG {matrix.year} seat matrix</caption>
                  <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 font-semibold">Seat</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-semibold">Seats</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-semibold">Colleges</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {matrix.byMatrix.map((m) => (
                      <tr key={m.seatMatrix}>
                        <th scope="row" className="px-4 py-2 font-medium text-foreground">{MATRIX_LABEL[m.seatMatrix] ?? m.seatMatrix}</th>
                        <td className="tnum px-4 py-2 text-right">{n(m.seats)}</td>
                        <td className="tnum px-4 py-2 text-right text-muted-foreground">{n(m.colleges)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[15px] leading-relaxed text-foreground">{c.state_line}</p>
              {states.length > 0 && (
                <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                  {states.map((s, i) => (
                    <span key={s.slug}>
                      {i > 0 && ", "}
                      <Link href={`/counselling/neet-pg/${s.slug}`} className="font-medium text-primary-strong hover:underline dark:text-primary">
                        {s.name}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- round by round -------------------- */}
      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="list" eyebrow="Round by round" title={c.rounds_title} />
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="dt w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Round</th>
                <th scope="col" className="px-4 py-3 font-semibold">Choices</th>
                <th scope="col" className="px-4 py-3 font-semibold">Upgrade</th>
                <th scope="col" className="px-4 py-3 font-semibold">Seat chhodna</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border align-top">
              {rounds.map((r) => (
                <tr key={r[0]}>
                  <th scope="row" className="px-4 py-3 font-semibold text-foreground">{r[0]}</th>
                  <td className="px-4 py-3 leading-relaxed text-muted-foreground">{r[1]}</td>
                  <td className="px-4 py-3 leading-relaxed text-muted-foreground">{r[2] ?? ""}</td>
                  <td className="px-4 py-3 leading-relaxed text-muted-foreground">{r[3] ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-heading font-bold text-foreground">Freeze</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{c.freeze}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-heading font-bold text-foreground">Float</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{c.float}</p>
          </div>
        </div>
        {r2 && <p className="mt-4 text-[14.5px] leading-relaxed text-foreground">{c.upgrade_line}</p>}
        <p className="mt-3 text-[13.5px] text-muted-foreground">
          Poori detail English me:{" "}
          <Link href="/neet-pg-choice-filling" className="font-semibold text-primary-strong hover:underline dark:text-primary">choice filling, upgradation aur free exit</Link> ·{" "}
          <Link href="/neet-pg-process" className="font-semibold text-primary-strong hover:underline dark:text-primary">NEET PG counselling process</Link>
        </p>
      </section>

      {/* -------------------- dates -------------------- */}
      {dates.length > 0 && (
        <section className="container-custom pb-10 md:pb-14">
          <SectionHead icon="document" eyebrow={`MCC · ${YEAR}`} title={c.dates_title} />
          <ScheduleRevisionNote rows={schedule} className="mt-5" />
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="dt w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Round</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Choice filling</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Locking</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Result</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Reporting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dates.map((s) => (
                  <tr key={s.round}>
                    <th scope="row" className="px-4 py-2.5 font-medium text-foreground">
                      {s.round}
                      {s.sourceUrl && (
                        <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex align-middle text-primary" aria-label={`MCC ka notice: ${s.round}`}>
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </th>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.choiceFilling ?? s.aiq}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.choiceLocking ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.result ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.reporting ?? s.aiqJoinBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <TelegramRoundAlert placement="round_alert_pg_kaise" className="pb-10 md:pb-14" />

      {/* -------------------- deposit -------------------- */}
      <section className="container-custom pb-10 md:pb-14">
        <SectionHead icon="money" eyebrow="Fee aur deposit" title="Registration fee aur security deposit" />
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="dt w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Candidate</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Registration fee</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Security deposit (refundable)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DEPOSITS.map((d) => (
                <tr key={d.who}>
                  <th scope="row" className="px-4 py-2.5 font-medium text-foreground">{d.who}</th>
                  <td className="tnum px-4 py-2.5 text-right">{exactInr(d.registration)}</td>
                  <td className="tnum px-4 py-2.5 text-right font-semibold">{exactInr(d.deposit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container-custom pb-10 md:pb-14">
        <DataPageCounsel kind="cutoff" name="NEET PG counselling" placement="counsel_pg_kaise" />
      </section>

      {/* -------------------- FAQ -------------------- */}
      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <SectionHead icon="help" eyebrow="FAQ" title={c.faq_title} />
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
                <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------- sources -------------------- */}
      <section className="container-custom py-10 md:py-14">
        <div className="rounded-2xl border border-border bg-card px-5 py-5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <Info className="h-4 w-4 text-primary" aria-hidden="true" /> Ye rules kahan se hain
          </h2>
          <ul className="mt-3 space-y-1.5 text-[14px]">
            {[SOURCES.bulletin, SOURCES.notice5, SOURCES.userGuide].map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary-strong hover:underline dark:text-primary">
                  {s.title}
                </a>{" "}
                <span className="text-muted-foreground">— {s.by}, {s.date}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Aur dekhein:{" "}
            <Link href={`/neet-pg-counselling/${YEAR}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">NEET PG {YEAR} round results</Link> ·{" "}
            <Link href="/md-ms-india/bond" className="font-semibold text-primary-strong hover:underline dark:text-primary">PG bond state wise</Link> ·{" "}
            <Link href="/md-ms-india/fees" className="font-semibold text-primary-strong hover:underline dark:text-primary">PG fees state wise</Link> ·{" "}
            <Link href="/neet-pg-low-score-clinical-branches" className="font-semibold text-primary-strong hover:underline dark:text-primary">kam rank par clinical branch</Link>
          </p>
        </div>
      </section>

      <LinkCards
        title="Aur padhein"
        links={[
          { label: "Open states (doosre state ki counselling)", href: "/neet-pg-open-states", note: "Kaun se states doosre state ke candidates lete hain" },
          { label: "In-service quota, state wise", href: "/neet-pg-in-service-quota", note: "Government doctors ke liye seats" },
          { label: "Documents ki list (MCC aur states)", href: "/neet-pg-documents", note: "Reporting par kaun se original chahiye" },
          { label: "Security deposit refund", href: "/neet-pg-choice-filling#security-deposit-refund", note: "Kab aur kaise wapas milta hai" },
          { label: "Counsellor kaise chunein", href: "/counselling", note: "Fraud agent se kaise bachein" },
        ]}
      />
      <LeadCapture level="pg" source="NEET PG counselling kaise hoti hai" title={c.lead_title} body={c.lead_body} />
      <TelegramJoin placement="pg_kaise" />
    </main>
  );
}
