import { OG_IMAGE } from "@/lib/ogImage";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, CheckCircle2, FileText, KeyRound, ListChecks, PhoneCall, UserRound } from "lucide-react";
import { currentUser } from "@/lib/userAuth";
import { safeNext } from "@/lib/safeNext";
import { pageCopy } from "@/lib/pageCopy";
import { getLiveFigures } from "@/lib/liveFigures";
import LoginFlow from "@/components/auth/LoginFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in or create your free account | AdmissionHands",
  description:
    "One free account for MBBS and MD/MS counselling: the colleges your NEET rank reached with your chance at each, fees, your documents, and an expert counsellor who already knows your profile.",
  // Not indexed, but it still gets shared in WhatsApp groups — an unfurled card with no title is a link nobody taps.
  alternates: { canonical: "/login" },
  openGraph: {
    title: "Your NEET seat plan, in one account | AdmissionHands",
    description: "Sign in or create a free account: your colleges with your chance, fees, documents and an expert counsellor.",
    url: "/login",
    type: "website",
    images: [OG_IMAGE],
  },
  robots: { index: false, follow: false },
};

/**
 * Sign in and sign up, side by side (owner, 2026-11-10: "Sign Up & login alag sa hona chaiye. Sign up ke bad kya benefit +
 * usage milta hai wo bhi mention ho… Expert Admission Strategist"). Two tabs over one AuthFlow (components/auth/LoginFlow):
 * "Sign in" asks for the number alone; "Create free account" for number, name, rank and category. Beside it, what the
 * account actually gives — every line a feature the site has — how to use it, and the team's own figures.
 * Words: Admin → Content → "Page: sign in / create account". `?mode=signup` opens the second tab.
 */
const ICONS = [ListChecks, UserRound, PhoneCall, FileText, KeyRound];

export default async function LoginPage(props: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const searchParams = await props.searchParams;
  if (await currentUser()) {
    // Only ever bounce to our own paths. `next` comes from the URL — see safeNext.
    redirect(safeNext(searchParams.next));
  }
  const [team, live] = await Promise.all([pageCopy("page.services.figures"), getLiveFigures()]);
  const c = await pageCopy("page.login", { years: team.years, students: team.students });
  const lines = (t: string) => t.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((x) => x[0]);
  const benefits = lines(c.benefits).filter((x) => x[1]);
  const steps = c.steps.split("\n").map((x) => x.trim()).filter(Boolean);
  const badges = [
    { v: team.years, w: "years of NEET counselling" },
    { v: team.students, w: "students guided" },
    ...(/^\d/.test(live.nmc_colleges ?? "") ? [{ v: live.nmc_colleges, w: "medical colleges, known seat by seat" }] : []),
  ];

  return (
    <main className="min-h-screen bg-background">
      <section className="relative isolate overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary-soft/80 via-background to-background" aria-hidden="true" />
        <div className="container-custom py-8 md:py-10">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-strong">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" /> {c.eyebrow}
          </p>
          <h1 className="mt-3 font-heading text-[clamp(1.9rem,4vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground">
            {c.title} <span className="text-primary-strong">{c.accent}</span>
          </h1>
          <p className="mt-3 max-w-[70ch] text-[15.5px] leading-relaxed text-muted-foreground">{c.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.w} className="inline-flex items-baseline gap-1.5 rounded-full border border-primary/15 bg-card px-3 py-1.5 text-[13px] text-muted-foreground">
                <b className="tnum font-heading text-base text-primary-strong">{b.v}</b> {b.w}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-soft px-3 py-1.5 text-[13px] font-semibold text-foreground">
              Expert admission strategists for MBBS &amp; MD/MS
            </span>
          </div>
        </div>
      </section>

      <div className="container-custom grid gap-8 py-8 md:py-12 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="lg:sticky lg:top-[calc(var(--site-top,112px)_+_1rem)]">
          <LoginFlow next={searchParams.next} initialMode={searchParams.mode === "signup" ? "signup" : "signin"} />
        </div>

        <div className="space-y-6">
          <section aria-labelledby="login-benefits">
            <h2 id="login-benefits" className="font-heading text-xl font-bold text-foreground">
              {c.benefits_title}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {benefits.map(([t, d], i) => {
                const Icon = ICONS[i % ICONS.length];
                return (
                  <li key={t} className="rounded-2xl border border-border bg-card p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <p className="mt-3 font-semibold text-foreground">{t}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{d}</p>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="login-steps" className="rounded-2xl border border-primary/20 bg-primary-soft p-5">
            <h2 id="login-steps" className="font-heading text-lg font-bold text-foreground">
              {c.steps_title}
            </h2>
            <ol className="mt-3 space-y-2.5">
              {steps.map((st, i) => (
                <li key={st} className="flex gap-3 text-[15px] leading-relaxed text-foreground">
                  <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-strong text-sm font-bold text-primary-foreground">{i + 1}</span>
                  <span className="pt-0.5">{st}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              {c.trust}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
