import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Compass,
  Handshake,
  Landmark,
  MapPinned,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Wallet,
} from "lucide-react";
import QuickPgForm from "@/components/lead/QuickPgForm";
import ScheduleRevisionNote from "@/components/mcc/ScheduleRevisionNote";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { CONTACT_INFO } from "@/lib/constants";
import { getContactInfo, resolveMetadata } from "@/lib/content";
import { pageCopy } from "@/lib/pageCopy";
import { getPgProcessContent } from "@/lib/pgProcessContent";
import { PG_COUNSELLING_YEAR as YEAR } from "@/lib/pgRoundNow";
import { fitDescription, fitTitle } from "@/lib/seoTitle";

/**
 * /neet-pg-round-3-strategy — the Google Ads landing page for NEET PG candidates after Round 2 (owner, 2026-11-16: "Round 2
 * bhi khtam hogya still not got seat ya jo bande eligible hone ka wait kar rahe hai unko target kare… without number claims";
 * then "english mai karo… marketing aggressive language… Top clinical branches, Top medical colleges… compact").
 *
 * Strong English and no figures. Every rule it states is MCC's (lib/choiceFillingRules.ts: round 3 has no resignation or
 * upgrade; a round 2+ seat not joined costs the deposit; the stray round is only for candidates holding no seat; a state
 * seat joined by the state's round 3 removes you before MCC's stray). "Top clinical branches / top medical colleges" are
 * what the strategy goes after, never a result promised. The way of working is the team's own account, and the page says
 * outright that nobody can guarantee a seat — which Google Ads' misrepresentation policy needs too.
 *
 * noindex, follow and out of the sitemap: it carries no data of its own, and the round pages answer "neet pg round 3" for
 * search. Every word is in Admin → Content → "Page: NEET PG after Round 2 (ads landing page)". Leads are tagged with the
 * page, taps carry `r3_*` placements.
 */

const PATH = "/neet-pg-round-3-strategy";
const SOURCE = `Ads landing — NEET PG after Round 2 (${PATH})`;
const rows = (t: string) =>
  t
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((x) => x[0] && x[1]);

export async function generateMetadata(): Promise<Metadata> {
  const meta = await resolveMetadata(PATH, {
    title: fitTitle(
      "NEET PG Round 3 & Stray Round Counselling: Expert Strategy",
      "NEET PG Round 3 Counselling: Expert Strategy",
      "NEET PG Round 3 Expert Counselling",
    ),
    description: fitDescription(
      "Missed out in NEET PG Round 2? Round 3, state rounds and the stray round still release seats. Get a personal strategy and a precision choice list from an expert counsellor.",
    ),
    keywords: "neet pg round 3 counselling, neet pg stray round, no seat in round 2 neet pg, neet pg counsellor, neet pg round 3 strategy",
  });
  return { ...meta, robots: { index: false, follow: true } };
}

const WIN_ICON = [Stethoscope, Building2, Landmark, Wallet];
const WHY_ICON = [MapPinned, Handshake, ShieldCheck, UserRound];

export default async function NeetPgRound3Page() {
  const [c, quick, contact, { schedule }] = await Promise.all([
    pageCopy("page.pg_round3", { year: YEAR }),
    pageCopy("site.quick_form", { college: "Round 3", topic: "Round 3" }),
    getContactInfo().catch(() => null),
    getPgProcessContent(),
  ]);
  const waNumber = (contact?.whatsappNumber || CONTACT_INFO.whatsapp).replace(/\D/g, "");
  const phone = contact?.phoneNumber || CONTACT_INFO.phone;
  const wa = (text: string) => `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
  const points = c.points.split("\n").map((x) => x.trim()).filter(Boolean);
  const wins = rows(c.wins);
  const situations = rows(c.situations);
  const traps = rows(c.traps);
  const steps = rows(c.steps);
  const why = rows(c.why);
  const faqs = rows(c.faq);
  // What is left, from the admin's MCC schedule: round 2's reporting, then round 3 and the stray round as they stand.
  const later = schedule.filter((s) => /^(round 2|round 3|stray)/i.test(s.round));
  const dateLine = (s: (typeof later)[number]) =>
    /^round 2/i.test(s.round) ? (s.reporting ? `reporting ${s.reporting}` : null) : s.choiceFilling ? `choice filling ${s.choiceFilling}` : s.aiq && s.aiq !== "—" ? s.aiq : null;
  const dates = later.map((s) => ({ round: s.round, line: dateLine(s) })).filter((x) => x.line);
  const formCopy = {
    name: quick.name,
    phone: quick.phone,
    rank: quick.rank,
    rank_hint: quick.rank_hint,
    button: c.form_button || quick.button,
    done: c.form_done || quick.done,
    privacy: quick.privacy,
  };
  const waBtn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 text-[15px] font-bold text-accent-foreground hover:bg-accent/90";
  const callBtn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-[15px] font-semibold text-foreground hover:border-primary/40";
  const h2 = "font-heading text-[clamp(1.4rem,2.6vw,1.95rem)] font-extrabold leading-tight text-foreground";

  return (
    <main className="min-h-screen bg-background" lang="en-IN">
      {/* ---------------------------------------------------------------- hero: the promise, the form, the clock */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary-soft to-background">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="container-custom relative grid gap-8 py-9 md:py-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.12em] text-primary-strong dark:text-primary">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-card text-primary shadow-sm">
                <Compass className="h-4 w-4" aria-hidden="true" />
              </span>
              {c.eyebrow}
            </p>
            <h1 className="mt-4 font-heading text-[clamp(2.1rem,4.8vw,3.5rem)] font-extrabold leading-[1.06] text-foreground">
              {c.title} <span className="block text-primary-strong dark:text-primary">{c.accent}</span>
            </h1>
            <p className="mt-4 max-w-[60ch] text-[16.5px] leading-relaxed text-muted-foreground">{c.subtitle}</p>
            {points.length > 0 && (
              <ul className="mt-5 space-y-2">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[15.5px] font-medium text-foreground">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#plan" data-placement="r3_hero_cta" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-strong px-6 text-[15px] font-bold text-primary-foreground shadow-glow hover:opacity-95">
                {c.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href={wa(c.wa_text)} target="_blank" rel="noopener" data-placement="r3_hero_wa" className={waBtn}>
                <WhatsAppIcon size={18} aria-hidden="true" /> {c.wa}
              </a>
              <a href={`tel:${phone}`} data-placement="r3_hero_call" className={callBtn}>
                <Phone className="h-4 w-4" aria-hidden="true" /> {c.call}
              </a>
            </div>
            {/* The clock: why now, with MCC's own dates as the admin keeps them. */}
            <div className="mt-6 flex gap-3 rounded-2xl border border-primary/25 bg-card/80 p-4">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong dark:text-primary" aria-hidden="true" />
              <div className="min-w-0 text-[14px] leading-relaxed">
                <p className="font-bold text-foreground">{c.urgency_title}</p>
                <p className="text-muted-foreground">{c.urgency_body}</p>
                {dates.length > 0 && (
                  <p className="mt-1.5 text-foreground">
                    {dates.map((d, i) => (
                      <span key={d.round}>
                        {i > 0 && <span className="text-muted-foreground"> · </span>}
                        <span className="font-semibold">{d.round}:</span> {d.line}
                      </span>
                    ))}
                    {c.dates_note && <span className="block text-[12.5px] text-muted-foreground">{c.dates_note}</span>}
                  </p>
                )}
              </div>
            </div>
            <ScheduleRevisionNote rows={later} className="mt-3" />
          </div>
          <div className="rounded-3xl border border-primary/25 bg-card p-5 shadow-lift md:p-6" id="plan">
            <h2 className="font-heading text-[1.35rem] font-extrabold leading-tight text-foreground">{c.form_title}</h2>
            {c.form_body && <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{c.form_body}</p>}
            <div className="mt-4">
              <QuickPgForm source={SOURCE} waHref={wa(c.wa_text)} copy={formCopy} stacked formName="round3_form" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- what the strategy goes after */}
      {wins.length > 0 && (
        <section className="container-custom py-8 md:py-10" id="aim">
          <h2 className={h2}>{c.wins_title}</h2>
          {c.wins_intro && <p className="mt-1.5 max-w-[70ch] text-[15.5px] text-muted-foreground">{c.wins_intro}</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {wins.map(([title, text], i) => {
              const Icon = WIN_ICON[i % WIN_ICON.length];
              return (
                <div key={title} className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 to-card p-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-strong text-primary-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 font-heading text-[1.08rem] font-extrabold text-foreground">{title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{text}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- where do you stand */}
      {situations.length > 0 && (
        <section className="border-y border-border bg-surface-1 py-8 md:py-10" id="situations">
          <div className="container-custom">
            <h2 className={h2}>{c.situations_title}</h2>
            {c.situations_intro && <p className="mt-1.5 max-w-[70ch] text-[15.5px] text-muted-foreground">{c.situations_intro}</p>}
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {situations.map(([title, text, msg], i) => (
                <div key={title} className="flex flex-col rounded-2xl border border-border bg-card p-4">
                  <h3 className="font-heading text-[1.05rem] font-bold text-foreground">{title}</h3>
                  <p className="mt-1.5 flex-1 text-[14px] leading-relaxed text-muted-foreground">{text}</p>
                  <a href={wa(msg || c.wa_text)} target="_blank" rel="noopener" data-placement={`r3_case_${i + 1}`} className="mt-3 inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-accent px-4 text-[14px] font-bold text-accent-foreground hover:bg-accent/90">
                    <WhatsAppIcon size={16} aria-hidden="true" /> {c.situation_button}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- the mistakes that cost the seat */}
      {traps.length > 0 && (
        <section className="container-custom py-8 md:py-10" id="mistakes">
          <h2 className={h2}>{c.traps_title}</h2>
          {c.traps_intro && <p className="mt-1.5 max-w-[70ch] text-[15.5px] text-muted-foreground">{c.traps_intro}</p>}
          <div className="mt-5 grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            {traps.map(([title, text]) => (
              <div key={title} className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong dark:text-primary" aria-hidden="true" />
                <div>
                  <h3 className="font-heading text-[1rem] font-bold text-foreground">{title}</h3>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- how it works, and why us */}
      <section className="border-y border-border bg-surface-1 py-8 md:py-10" id="how">
        <div className="container-custom grid gap-8 lg:grid-cols-2 lg:items-start">
          {steps.length > 0 && (
            <div>
              <h2 className={h2}>{c.steps_title}</h2>
              <ol className="mt-5 space-y-2.5">
                {steps.map(([title, text], i) => (
                  <li key={title} className="flex gap-3.5 rounded-2xl border border-border bg-card p-3.5">
                    <span className="tnum flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-strong font-heading text-[14px] font-extrabold text-primary-foreground">{i + 1}</span>
                    <div>
                      <h3 className="font-heading text-[1rem] font-bold text-foreground">{title}</h3>
                      <p className="mt-0.5 text-[14px] leading-relaxed text-muted-foreground">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {why.length > 0 && (
            <div>
              <h2 className={h2}>{c.why_title}</h2>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {why.map(([title, text], i) => {
                  const Icon = WHY_ICON[i % WHY_ICON.length];
                  return (
                    <div key={title} className="rounded-2xl border border-border bg-card p-3.5">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      <h3 className="mt-2 font-heading text-[1rem] font-bold text-foreground">{title}</h3>
                      <p className="mt-0.5 text-[14px] leading-relaxed text-muted-foreground">{text}</p>
                    </div>
                  );
                })}
              </div>
              {c.promise_note && (
                <p className="mt-3 flex items-start gap-2.5 rounded-2xl border border-primary/25 bg-primary-soft/60 p-3.5 text-[14px] font-medium leading-relaxed text-foreground">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong dark:text-primary" aria-hidden="true" />
                  {c.promise_note}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- questions */}
      {faqs.length > 0 && (
        <section className="container-custom py-8 md:py-10" id="faq">
          <h2 className={h2}>{c.faq_title}</h2>
          <div className="mt-5 grid gap-x-6 gap-y-4 lg:grid-cols-2">
            {faqs.map(([q, a]) => (
              <div key={q} className="border-l-2 border-primary/40 pl-4">
                <h3 className="font-heading text-[1rem] font-bold text-foreground">{q}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- the last ask */}
      <section className="container-custom pb-10 md:pb-12">
        <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary-soft to-background p-6 text-center md:p-8">
          <h2 className={h2}>{c.end_title}</h2>
          {c.end_body && <p className="mx-auto mt-2 max-w-[60ch] text-[16px] text-muted-foreground">{c.end_body}</p>}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href="#plan" data-placement="r3_end_cta" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-strong px-6 text-[15px] font-bold text-primary-foreground shadow-glow hover:opacity-95">
              {c.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href={wa(c.wa_text)} target="_blank" rel="noopener" data-placement="r3_end_wa" className={waBtn}>
              <WhatsAppIcon size={18} aria-hidden="true" /> {c.wa}
            </a>
            <a href={`tel:${phone}`} data-placement="r3_end_call" className={callBtn}>
              <Phone className="h-4 w-4" aria-hidden="true" /> {c.call}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
