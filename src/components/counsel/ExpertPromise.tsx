import Link from "@/components/ui/Link";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  Globe2,
  Handshake,
  ListOrdered,
  MessageCircle,
  Phone,
  Route,
  ShieldCheck,
  Target,
  UserRoundSearch,
  XCircle,
} from "lucide-react";
import SectionHead from "@/components/ui/SectionHead";
import { pageCopy } from "@/lib/pageCopy";
import { getContactInfo } from "@/lib/content";
import { CONTACT_INFO } from "@/lib/constants";
import { pairs } from "@/components/counsel/CounselBlocks";

/**
 * Why a family can lean on an expert counsellor, and how to tell a genuine one from an agent (owner, 2026-11-12:
 * "canidates expert counsellor par bharosa dependence samjhe + hum genuine expert counselor with 15+ year experience, we
 * are not agents, not affiliated with some limited colleges, we do all over India admission, every type of seats,
 * colleges, counselling, MCC, State, Govt, Private, Deemed… strategy, profiling"). Answers the searches the journey study
 * found the site absent from: "best neet pg counsellor", "neet pg counselling guidance", "direct admission in md ms",
 * "neet pg seat booking", "donation for md seat".
 *
 * Every word is in Admin → Content → "Counselling: why an expert counsellor" (`page.counsel_expert`). The team's years and
 * students are its own figures (`page.services.figures`). No promise of a seat,
 * no "best" of our own, no invented student — the page tells a family how to judge any counsellor, us included.
 *
 * `full` on /counselling; `state` (the choosing and the fraud sections) on /counselling/neet-pg/<state>.
 */

const lines = (v: string) =>
  v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const PILLAR_ICON = [BadgeCheck, Handshake, Globe2, Building2];
const METHOD_ICON = [UserRoundSearch, Target, ListOrdered, Route, FileCheck2, MessageCircle];

export async function expertFaqs(): Promise<{ question: string; answer: string }[]> {
  const c = await copy();
  return pairs(c.faqs).map(([question, answer]) => ({ question, answer }));
}

async function copy() {
  const team = await pageCopy("page.services.figures");
  return pageCopy("page.counsel_expert", { years: team.years, students: team.students });
}

export default async function ExpertPromise({ variant = "full", placement, stateName }: { variant?: "full" | "state"; placement: string; stateName?: string }) {
  const [c, contact] = await Promise.all([copy(), getContactInfo().catch(() => null)]);
  const phone = contact?.phoneNumber || CONTACT_INFO.phone;
  const waNumber = (contact?.whatsappNumber || CONTACT_INFO.whatsapp).replace(/\D/g, "");
  const wa = (text: string) => `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
  const pillars = pairs(c.pillars);
  const cover = lines(c.cover);
  const method = pairs(c.method);
  const good = lines(c.choose_good);
  const bad = lines(c.choose_bad);
  const fraud = pairs(c.fraud_points);
  const where = stateName ? ` in ${stateName}` : "";

  const choosing = (
    <section className="container-custom py-12 md:py-16" aria-labelledby={`choose-${placement}`}>
      <SectionHead icon="people" id={`choose-${placement}`} eyebrow={c.choose_eyebrow} title={`${c.choose_title}${where}`} intro={c.choose_intro} />
      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-signal-safe/30 bg-card">
          <div className="flex items-center gap-2.5 border-b border-border bg-signal-safe/[0.07] px-5 py-3.5">
            <ShieldCheck className="h-5 w-5 text-signal-safe" aria-hidden="true" />
            <h3 className="font-heading text-[16px] font-extrabold text-foreground">{c.good_title}</h3>
          </div>
          <ul className="space-y-3 px-5 py-4">
            {good.map((g) => (
              <li key={g} className="flex gap-2.5 text-[14.5px] leading-snug text-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal-safe" aria-hidden="true" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="overflow-hidden rounded-2xl border border-signal-borderline/30 bg-card">
          <div className="flex items-center gap-2.5 border-b border-border bg-signal-borderline/[0.07] px-5 py-3.5">
            <AlertTriangle className="h-5 w-5 text-signal-borderline" aria-hidden="true" />
            <h3 className="font-heading text-[16px] font-extrabold text-foreground">{c.bad_title}</h3>
          </div>
          <ul className="space-y-3 px-5 py-4">
            {bad.map((b) => (
              <li key={b} className="flex gap-2.5 text-[14.5px] leading-snug text-foreground">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-signal-stretch" aria-hidden="true" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );

  const fraudBlock = (
    <section className="border-y border-border bg-surface-1 py-12 md:py-16" aria-labelledby={`fraud-${placement}`}>
      <div className="container-custom">
        <SectionHead icon="document" id={`fraud-${placement}`} eyebrow={c.fraud_eyebrow} title={c.fraud_title} />
        <div className="mt-6 rounded-2xl border border-primary/25 bg-card p-5 md:p-6">
          <p className="font-heading text-[17px] font-bold leading-snug text-foreground md:text-[19px]">{c.fraud_lead}</p>
          {c.fraud_source && <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{c.fraud_source}</p>}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {fraud.map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-heading text-[16px] font-bold leading-snug text-foreground">{t}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <a
          href={wa(c.fraud_wa)}
          target="_blank"
          rel="noopener"
          data-placement={`${placement}_fraud`}
          className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-bold text-accent-foreground hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" /> {c.fraud_cta}
        </a>
      </div>
    </section>
  );

  if (variant === "state") return (
    <>
      {choosing}
      {fraudBlock}
    </>
  );

  return (
    <>
      {/* ------------------------------------------------ who we are */}
      <section className="relative overflow-hidden py-12 md:py-16" aria-labelledby="expert-who">
        <div className="ambient-blob pointer-events-none absolute -right-40 top-0 h-[24rem] w-[24rem] bg-primary/10" aria-hidden="true" />
        <div className="container-custom relative">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-12">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-strong dark:text-primary">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> {c.eyebrow}
              </p>
              <h2 id="expert-who" className="font-heading mt-4 text-[clamp(1.6rem,3vw,2.3rem)] font-extrabold leading-tight tracking-[-0.02em] text-foreground [text-wrap:balance]">
                {c.title} <span className="text-primary-strong dark:text-primary">{c.accent}</span>
              </h2>
              <p className="mt-4 max-w-[60ch] text-[15.5px] leading-relaxed text-muted-foreground">{c.intro}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={wa(c.wa_text)}
                  target="_blank"
                  rel="noopener"
                  data-placement={`${placement}_who`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary-strong px-5 text-[15px] font-bold text-primary-foreground hover:opacity-90"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> {c.cta_primary}
                </a>
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                  data-placement={`${placement}_who`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-5 text-[15px] font-bold text-foreground hover:border-primary/40"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" /> {c.cta_call}
                </a>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {pillars.map(([t, d], i) => {
                const Icon = PILLAR_ICON[i % PILLAR_ICON.length];
                return (
                  <li key={t} className="rounded-2xl border border-border bg-card p-5 shadow-lift">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-strong ring-1 ring-primary/15 dark:text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-3 font-heading text-[16px] font-bold leading-snug text-foreground">{t}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{d}</p>
                  </li>
                );
              })}
            </ul>
          </div>

          {cover.length > 0 && (
            <div className="mt-10 rounded-2xl border border-border bg-surface-1 p-5 md:p-6">
              <h3 className="font-heading text-[17px] font-bold text-foreground">{c.cover_title}</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {cover.map((x) => (
                  <li key={x} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13.5px] font-medium text-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> {x}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------ how a counsellor works the case */}
      {method.length > 0 && (
        <section className="border-y border-border bg-surface-1 py-12 md:py-16" aria-labelledby="expert-method">
          <div className="container-custom">
            <SectionHead icon="route" id="expert-method" eyebrow={c.method_eyebrow} title={c.method_title} intro={c.method_intro} />
            <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {method.map(([t, d], i) => {
                const Icon = METHOD_ICON[i % METHOD_ICON.length];
                return (
                  <li key={t} className="relative rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <span className="tnum flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-strong text-sm font-bold text-primary-foreground">{i + 1}</span>
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="mt-3 font-heading text-[16px] font-bold leading-snug text-foreground">{t}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{d}</p>
                  </li>
                );
              })}
            </ol>
            <p className="mt-6 max-w-[80ch] text-[13.5px] leading-relaxed text-muted-foreground">
              {c.method_note}{" "}
              <Link href="/neet-college-predictor" className="font-semibold text-primary-strong underline-offset-2 hover:underline dark:text-primary">
                {c.method_link}
              </Link>
            </p>
          </div>
        </section>
      )}

      {choosing}
      {fraudBlock}
    </>
  );
}
