import { OG_IMAGE } from "@/lib/ogImage";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, Bell, Briefcase, FileText, KeyRound, ListChecks, Lock, PhoneCall, Sparkles, UserRound } from "lucide-react";
import { currentUser } from "@/lib/userAuth";
import { safeNext } from "@/lib/safeNext";
import { pageCopy } from "@/lib/pageCopy";
import { getLiveFigures } from "@/lib/liveFigures";
import LoginFlow from "@/components/auth/LoginFlow";
import CounsellorFaces from "@/components/lead/CounsellorFaces";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in or create your free account | AdmissionHands",
  description:
    "One free account for MBBS and MD/MS counselling: the colleges your NEET rank reached with your chance at each, latest counselling updates, your documents, and an expert counsellor who already knows your profile.",
  // Not indexed, but it still gets shared in WhatsApp groups — an unfurled card with no title is a link nobody taps.
  alternates: { canonical: "/login" },
  openGraph: {
    title: "Your NEET seat plan, in one account | AdmissionHands",
    description: "Sign in or create a free account: your colleges with your chance, latest updates, documents and an expert counsellor.",
    url: "/login",
    type: "website",
    images: [OG_IMAGE],
  },
  robots: { index: false, follow: false },
};

/**
 * Sign in and sign up (owner, 2026-11-10: "Sign Up & login alag sa hona chaiye… benefit + usage… latest updates… ekdum
 * beautiful designed"). Two columns: the auth card (two tabs over one AuthFlow, components/auth/LoginFlow) and a brand
 * panel — what the account gives (every line a feature the site has: /account shows the student's latest notices), how to
 * use it, the team's own figures and the counsellors by name. On a phone the card comes first.
 * Words: Admin → Content → "Page: sign in / create account". `?mode=signup` opens the second tab.
 */
const ICONS = [ListChecks, Bell, PhoneCall, UserRound, FileText, Briefcase, KeyRound];

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
  const stats = [
    { v: team.years, w: "years of NEET counselling" },
    { v: team.students, w: "students guided" },
    ...(/^\d/.test(live.nmc_colleges ?? "") ? [{ v: live.nmc_colleges, w: "medical colleges known seat by seat" }] : []),
  ];

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background">
      {/* Soft light backdrop: a wash, two glows and a faint grid — light, as every page here. */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/70 via-background to-background" />
        <div className="absolute -left-40 top-24 h-[30rem] w-[30rem] rounded-full bg-secondary/10 blur-[110px]" />
        <div className="absolute -right-32 top-[28rem] h-[26rem] w-[26rem] rounded-full bg-accent/10 blur-[110px]" />
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000,transparent)]" />
      </div>

      <div className="container-custom grid gap-8 py-8 md:py-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-start lg:gap-10 xl:gap-14">
        {/* ------------------------------ the auth card ------------------------------ */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-[calc(var(--site-top,112px)_+_1rem)]">
          <div className="rounded-[28px] border border-border bg-card/95 p-5 shadow-[0_24px_60px_-28px_hsl(var(--primary)/0.45)] backdrop-blur sm:p-7">
            <div className="mb-4 flex justify-end">
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent">
                <Lock className="h-3 w-3" aria-hidden="true" /> Secure · verified by a WhatsApp code
              </span>
            </div>
            <LoginFlow next={searchParams.next} initialMode={searchParams.mode === "signup" ? "signup" : "signin"} />
          </div>
        </div>

        {/* ------------------------------ the brand panel ------------------------------ */}
        <div className="order-2 lg:order-1">
          <p className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-strong">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" /> {c.eyebrow}
          </p>
          <h1 className="font-heading text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[1.05] tracking-[-0.035em] text-foreground">
            {c.title} <span className="text-primary-strong">{c.accent}</span>
          </h1>
          <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-muted-foreground">{c.subtitle}</p>

          <dl className="mt-6 grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.w} className="rounded-2xl border border-primary/15 bg-card/80 px-4 py-3 backdrop-blur">
                <dd className="tnum font-heading text-2xl font-extrabold text-primary-strong md:text-[1.75rem]">{s.v}</dd>
                <dt className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{s.w}</dt>
              </div>
            ))}
          </dl>

          <section aria-labelledby="login-benefits" className="mt-8">
            <h2 id="login-benefits" className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
              <Sparkles className="h-5 w-5 text-primary-strong" aria-hidden="true" /> {c.benefits_title}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {benefits.map(([t, d], i) => {
                const Icon = ICONS[i % ICONS.length];
                return (
                  <li key={t} className={`group flex gap-3 rounded-2xl border border-border bg-card/90 p-4 transition-colors hover:border-primary/35 ${i === 0 ? "sm:col-span-2" : ""}`}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-soft to-accent-soft text-primary-strong ring-1 ring-primary/15">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground">{t}</span>
                      <span className="mt-0.5 block text-[13.5px] leading-relaxed text-muted-foreground">{d}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="login-steps" className="mt-8 rounded-[24px] border border-primary/20 bg-gradient-to-br from-primary-soft via-card to-accent-soft p-5 md:p-6">
            <h2 id="login-steps" className="font-heading text-lg font-bold text-foreground">
              {c.steps_title}
            </h2>
            <ol className="mt-4 grid gap-4 md:grid-cols-3">
              {steps.map((st, i) => (
                <li key={st} className="relative">
                  <span className="tnum flex h-8 w-8 items-center justify-center rounded-full bg-primary-strong text-sm font-bold text-primary-foreground shadow-sm">{i + 1}</span>
                  <p className="mt-2 text-[14px] leading-relaxed text-foreground">{st}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="login-team" className="mt-8">
            <h2 id="login-team" className="font-heading text-lg font-bold text-foreground">
              The counsellors you will speak to
            </h2>
            <p className="mt-1 text-[13.5px] text-muted-foreground">Expert admission strategists for MBBS and MD/MS — named, reachable, and on WhatsApp.</p>
            <div className="mt-3">
              <CounsellorFaces withNames />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
