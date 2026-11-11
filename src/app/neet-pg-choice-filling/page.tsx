import type { Metadata } from "next";
import { ExternalLink, Info } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { getPgProcessContent } from "@/lib/pgProcessContent";
import { getUpgrades, liveChoiceRound as liveRound } from "@/lib/pgRoundNow";
import { DEPOSITS, DEPOSIT_NOTES, LOCKING_FACTS, ROUND_RULES, SOURCES, STATE_FACTS, type SourceKey } from "@/lib/choiceFillingRules";
import { exactInr } from "@/lib/chance";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroFacts from "@/components/hero/HeroFacts";
import SectionHead from "@/components/ui/SectionHead";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import TelegramRoundAlert from "@/components/engage/TelegramRoundAlert";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import ScheduleRevisionNote from "@/components/mcc/ScheduleRevisionNote";
import ChoiceStrategy from "@/components/lead/ChoiceStrategy";
import { hinglishFaqs } from "@/lib/hinglishFaq";

/**
 * NEET PG choice filling, locking, upgradation, free exit and resignation (2026-11-09; the keyword study's biggest
 * gap, ~210 phrases). Rules from MCC's documents only (lib/choiceFillingRules.ts, each cited on the page); dates from
 * the admin's pg_schedule, so MCC's revisions reach the page without a deploy; upgrade counts from MCC's own result
 * PDFs (mcc_allotments). Hero and FAQ words: Admin → Content → "Page: NEET PG choice filling …".
 */

const YEAR = 2026;
const PATH = "/neet-pg-choice-filling";

const n = (v: number) => v.toLocaleString("en-IN");

export async function generateMetadata(): Promise<Metadata> {
  const live = await liveRound().catch(() => null);
  const r = live?.label;
  return resolveMetadata(PATH, {
    title: r
      ? fitTitle(
          `NEET PG ${r} Choice Filling ${YEAR}: Dates, Locking, Upgradation & Free Exit`,
          `NEET PG ${r} Choice Filling ${YEAR}: Dates, Locking & Upgradation`,
          `NEET PG ${r} Choice Filling ${YEAR}: Dates & Locking`,
          `NEET PG ${r} Choice Filling ${YEAR}`,
        )
      : fitTitle(
          `NEET PG Choice Filling ${YEAR}: Locking, Upgradation & Free Exit Rules`,
          `NEET PG Choice Filling ${YEAR}: Locking, Upgradation & Free Exit`,
          `NEET PG Choice Filling ${YEAR}: Upgradation & Free Exit`,
          `NEET PG Choice Filling ${YEAR}`,
        ),
    description: fitDescription(
      ...(r && live?.filling
        ? [
            `NEET PG ${YEAR} ${r} choice filling: ${live.filling}${live.locking ? `; locking ${live.locking}` : ""}. Freeze vs Float, upgradation, free exit and forfeiture — from MCC's notices.`,
            `NEET PG ${YEAR} ${r} choice filling: ${live.filling}. Locking, upgradation and free exit rules from MCC.`,
          ]
        : []),
      `NEET PG ${YEAR} choice filling and locking, Freeze vs Float, upgradation, free exit in round 1, forfeiture from round 2, and the security deposit — from MCC's bulletin.`,
      `NEET PG ${YEAR} choice filling, upgradation and free exit rules, round by round, from MCC's bulletin.`,
    ),
    keywords: `NEET PG choice filling ${YEAR}, NEET PG round 2 choice filling, NEET PG round 2 choice filling date, NEET PG choice locking, NEET PG upgradation, NEET PG free exit, NEET PG round 2 free exit, NEET PG resignation, NEET PG freeze float, NEET PG security deposit, MCC PG counselling rules`,
  });
}

function Cite({ keys }: { keys: SourceKey[] }) {
  return (
    <span className="text-[12px] text-muted-foreground">
      Source:{" "}
      {keys.map((k, i) => (
        <span key={k}>
          {i > 0 && "; "}
          <a href={SOURCES[k].url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-primary">
            {SOURCES[k].by}, {SOURCES[k].date}
          </a>
        </span>
      ))}
    </span>
  );
}

export default async function ChoiceFillingPage() {
  const [{ schedule }, upgrades, live] = await Promise.all([getPgProcessContent(), getUpgrades(), liveRound().catch(() => null)]);
  const [copy, body, heroImage] = await Promise.all([
    pageCopy("page.pg_choice_filling.hero", { year: YEAR, round: live?.label ?? "" }),
    pageCopy("page.pg_choice_filling.body", { year: YEAR }),
    pageHeroImage("page.pg_choice_filling.hero", "page.pg_process.hero"),
  ]);
  const last = upgrades.find((u) => u.round === "Round 2")?.year;
  const r2 = upgrades.find((u) => u.year === last && u.round === "Round 2");
  const r3 = upgrades.find((u) => u.year === last && u.round === "Round 3");
  const faqs = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({
    question: (body as Record<string, string>)[`faq${i}_q`],
    answer: (body as Record<string, string>)[`faq${i}_a`],
  }));
  const steps = schedule.filter((s) => s.choiceFilling || s.choiceLocking || s.result || s.reporting);

  faqs.push(...(await hinglishFaqs("choice_filling")));
  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET PG counselling process", path: "/neet-pg-process" },
            { name: "Choice filling, upgradation & free exit", path: PATH },
          ]),
          webPage({ name: `NEET PG ${YEAR} choice filling, upgradation and free exit`, description: copy.subtitle, path: PATH }),
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "NEET PG process", href: "/neet-pg-process" }, { label: "Choice filling & free exit" }]}
        eyebrow={copy.eyebrow}
        title={live && copy.title_live ? copy.title_live : copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        image={heroImage}
        topic="document"
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_choice_filling"
        source={copy.source}
        visual={
          <HeroFacts
            title="Leaving a seat, round by round"
            facts={ROUND_RULES.map((r) => ({ label: r.round, value: r.exit }))}
            footnote="MCC's 2026 bulletin; its latest notice always wins."
          />
        }
        insights={[
          ...(r2 ? [{ icon: "up" as const, label: `Upgraded in round 2, ${r2.year}`, value: n(r2.upgraded), note: `of ${n(r2.allotted)} round 2 allotments` }] : []),
          ...(r3 ? [{ icon: "spark" as const, label: `Upgraded in round 3, ${r3.year}`, value: n(r3.upgraded), note: `of ${n(r3.allotted)} round 3 allotments` }] : []),
          { icon: "authority" as const, label: "AIQ security deposit", value: "₹25,000", note: "UR/EWS; ₹10,000 reserved; ₹2 lakh deemed" },
        ]}
      />

      {/* -------------------- round by round -------------------- */}
      <section className="container-custom py-10 md:py-14">
        <SectionHead
          icon="route"
          eyebrow="Round by round"
          title="What you can do in each round"
          intro="Each round has its own rules; once round 2 begins, round 2's rules apply. The last column is what leaving a seat costs."
        />
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="dt w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Round</th>
                <th scope="col" className="px-4 py-3 font-semibold">Choices</th>
                <th scope="col" className="px-4 py-3 font-semibold">Upgrade</th>
                <th scope="col" className="px-4 py-3 font-semibold">Leaving the seat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border align-top">
              {ROUND_RULES.map((r) => (
                <tr key={r.round}>
                  <th scope="row" className="px-4 py-3 font-semibold text-foreground">
                    {r.round}
                    <span className="mt-1 block w-fit rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary-strong">{r.exit}</span>
                  </th>
                  <td className="px-4 py-3 leading-relaxed text-muted-foreground">{r.choices}</td>
                  <td className="px-4 py-3 leading-relaxed text-muted-foreground">{r.upgrade}</td>
                  <td className="px-4 py-3 leading-relaxed text-muted-foreground">
                    {r.leaving}
                    <span className="mt-1.5 block">
                      <Cite keys={r.sources} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* -------------------- dates -------------------- */}
      {steps.length > 0 && (
        <section className="container-custom pb-10 md:pb-14">
          <SectionHead icon="list" eyebrow={`MCC · ${YEAR}`} title="Choice filling and locking dates" intro="MCC's dates for the All India, deemed, central university and DNB rounds. MCC revises them; its notice wins." />
          <ScheduleRevisionNote rows={schedule} className="mt-5" />
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="dt w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Round</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Choice filling</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Choice locking</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Result</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Reporting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {steps.map((s) => (
                  <tr key={s.round}>
                    <th scope="row" className="px-4 py-2.5 font-medium text-foreground">
                      {s.round}
                      {s.sourceUrl && (
                        <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex align-middle text-primary" aria-label={`MCC's notice for ${s.round}`}>
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

      <TelegramRoundAlert placement="round_alert_pg_choice_filling" className="pb-10 md:pb-14" />

      {/* -------------------- the order is the strategy (Expert Counselling) -------------------- */}
      <ChoiceStrategy
        placement="pg_choice_filling"
        tokens={{ year: YEAR, round: live?.label, upgraded: r2 ? n(r2.upgraded) : undefined, last_year: r2 ? String(r2.year) : undefined }}
      />

      {/* -------------------- locking -------------------- */}
      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom grid gap-6 lg:grid-cols-2">
          <div>
            <SectionHead icon="list" eyebrow="Choice filling" title="Filling and locking your choices" />
            <ul className="mt-5 space-y-2.5 text-[15px] leading-relaxed text-foreground">
              {LOCKING_FACTS.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-3"><Cite keys={["bulletin", "userGuide"]} /></p>
          </div>
          <div>
            <SectionHead icon="route" eyebrow="New in 2026" title="Freeze or Float" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-heading font-bold text-foreground">Freeze</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                  You keep the seat and want no upgrade. You join it in person at the allotted college, and to leave it you resign there.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-heading font-bold text-foreground">Float</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                  You want a better seat. The college verifies your documents online and you say yes to an upgrade online — no visit. The
                  willingness can be given only once. You resign online too.
                </p>
              </div>
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
              Until 2025 every step — reporting, upgrading, resigning — meant going to the college in person; MCC changed that for 2026.{" "}
              <Cite keys={["bulletin", "userGuide"]} />
            </p>
          </div>
        </div>
      </section>

      {/* -------------------- deposit -------------------- */}
      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="money" eyebrow="Fees and deposit" title="Registration fee and security deposit" />
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
        <ul className="mt-4 space-y-2 text-[14.5px] leading-relaxed text-muted-foreground">
          {DEPOSIT_NOTES.map((f) => (
            <li key={f} className="flex gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-2"><Cite keys={["bulletin"]} /></p>
      </section>

      <section className="container-custom pb-10 md:pb-14">
        <DataPageCounsel kind="cutoff" name="NEET PG choice filling" placement="counsel_pg_choice_filling" />
      </section>

      {/* -------------------- state + next year -------------------- */}
      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom grid gap-6 lg:grid-cols-2">
          <div>
            <SectionHead icon="map" eyebrow="AIQ and state" title="Holding an All India seat and a state seat" />
            <ul className="mt-5 space-y-2.5 text-[15px] leading-relaxed text-foreground">
              {STATE_FACTS.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-3"><Cite keys={["bulletin"]} /></p>
          </div>
          <div>
            <SectionHead icon="authority" eyebrow="Next year" title="Does leaving a seat bar you from next year's NEET PG?" />
            <p className="mt-5 text-[15px] leading-relaxed text-foreground">
              MCC&apos;s 2026 bulletin names no such bar. The consequences it names are losing the security deposit, and — not joining a
              round 3 seat — being out of every further MCC round. In the 2024 counselling MCC did announce that candidates who did not join
              a stray-round seat would be barred from the next year&apos;s exam, so read each year&apos;s notices; in March 2026 the Delhi High
              Court held that in the 2025 cycle only forfeiture applied.
            </p>
            <p className="mt-3"><Cite keys={["bulletin", "stray2024", "d19"]} /></p>
          </div>
        </div>
      </section>

      {/* -------------------- FAQ -------------------- */}
      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="help" eyebrow="FAQ" title={`NEET PG ${YEAR} choice filling: common questions`} />
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* -------------------- sources -------------------- */}
      <section className="container-custom pb-10 md:pb-14">
        <div className="rounded-2xl border border-border bg-card px-5 py-5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <Info className="h-4 w-4 text-primary" aria-hidden="true" /> Where these rules come from
          </h2>
          <ul className="mt-3 space-y-1.5 text-[14px]">
            {Object.values(SOURCES).map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary-strong hover:underline dark:text-primary">
                  {s.title}
                </a>{" "}
                <span className="text-muted-foreground">— {s.by}, {s.date}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Upgrade counts are from MCC&apos;s published round results. Also:{" "}
            <Link href="/neet-pg-process" className="font-semibold text-primary-strong hover:underline">the NEET PG counselling process</Link> ·{" "}
            <Link href="/neet-pg-counselling-kaise-hoti-hai" className="font-semibold text-primary-strong hover:underline">the same in Hinglish</Link> ·{" "}
            <Link href={`/neet-pg-counselling/${YEAR}`} className="font-semibold text-primary-strong hover:underline">NEET PG {YEAR} round results</Link> ·{" "}
            <Link href="/md-ms-india/fees" className="font-semibold text-primary-strong hover:underline">PG fees by state</Link> ·{" "}
            <Link href="/md-ms-india/bond" className="font-semibold text-primary-strong hover:underline">PG bond and seat-leaving penalty by state</Link>
          </p>
        </div>
      </section>

      <LeadCapture level="pg" source="NEET PG choice filling page" title={body.lead_title} body={body.lead_body} />
      <TelegramJoin placement="pg_choice_filling" />
    </main>
  );
}
