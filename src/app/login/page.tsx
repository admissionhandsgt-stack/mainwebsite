import { OG_IMAGE } from "@/lib/ogImage";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Bell, Briefcase, FileText, KeyRound, ListChecks, Lock, PhoneCall, Sparkles, UserRound } from "lucide-react";
import { currentUser } from "@/lib/userAuth";
import { safeNext } from "@/lib/safeNext";
import { pageCopy } from "@/lib/pageCopy";
import { getLiveFigures } from "@/lib/liveFigures";
import LoginFlow from "@/components/auth/LoginFlow";
import LoginShowcase from "@/components/auth/LoginShowcase";
import { getLiveAlerts } from "@/lib/content";
import counsellors from "@/data/counsellors.json";

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
 * Sign in and sign up (owner, 2026-11-10: "Sign Up & login alag sa hona chaiye… benefit + usage… latest updates", then
 * "bade bade brands ke design se idea leke kuch innovative"). The pattern of the big sign-in pages (Linear, Stripe,
 * Clerk): a narrow form column — two tabs over one AuthFlow (components/auth/LoginFlow), the counsellors as a face stack
 * — beside a brand panel that shows the account as it looks (components/auth/LoginShowcase: chance words, the newest
 * official notice, the counsellor, the document list). Every benefit is listed once more under the fold.
 * On a phone the form comes first. Words: Admin → Content → "Page: sign in / create account". `?mode=signup` opens the
 * second tab.
 */
const ICONS = [ListChecks, Bell, PhoneCall, UserRound, FileText, Briefcase, KeyRound];
type Counsellor = { slug: string; name: string; photo?: string };
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default async function LoginPage(props: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const searchParams = await props.searchParams;
  if (await currentUser()) {
    // Only ever bounce to our own paths. `next` comes from the URL — see safeNext.
    redirect(safeNext(searchParams.next));
  }
  const [team, live, alerts] = await Promise.all([pageCopy("page.services.figures"), getLiveFigures(), getLiveAlerts().catch(() => [])]);
  const c = await pageCopy("page.login", { years: team.years, students: team.students });
  const lines = (t: string) => t.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((x) => x[0]);
  const benefits = lines(c.benefits).filter((x) => x[1]);
  const steps = c.steps.split("\n").map((x) => x.trim()).filter(Boolean);
  const stats = [
    { v: team.years, w: "years of NEET counselling" },
    { v: team.students, w: "students guided" },
    ...(/^\d/.test(live.nmc_colleges ?? "") ? [{ v: live.nmc_colleges, w: "medical colleges known seat by seat" }] : []),
  ];
  // The newest national notice if there is one (MCC, NBEMS, NMC, NTA), else the newest of all.
  const national = alerts.find((a) => /\b(MCC|NBEMS|NMC|NTA|NEET)\b/i.test(a.title)) ?? alerts[0] ?? null;
  const team4 = counsellors as Counsellor[];
  const names = team4.map((x) => x.name.split(" ")[0]);
  const nameLine = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  return (
    <main className="relative bg-background">
      <section className="grid gap-4 p-3 sm:p-4 lg:min-h-[calc(100svh-var(--site-top,112px))] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-6">
        {/* ------------------------------ the form ------------------------------ */}
        <div className="px-1 pb-4 pt-4 sm:px-6 lg:px-10 lg:pt-14">
          <div className="mx-auto w-full max-w-[27rem] lg:sticky lg:top-[calc(var(--site-top,112px)_+_2rem)]">
            <p className="mb-5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent">
              <Lock className="h-3 w-3" aria-hidden="true" /> Secure · verified by a WhatsApp code
            </p>
            <LoginFlow next={searchParams.next} initialMode={searchParams.mode === "signup" ? "signup" : "signin"} />

            {/* The people behind the account, as a face stack (the pattern of every big sign-up page). */}
            <div className="mt-7 flex items-center gap-3 border-t border-border pt-5">
              <ul className="flex shrink-0 -space-x-1.5" aria-label="Our counsellors">
                {team4.map((x) => (
                  <li key={x.slug}>
                    <a href={`/${x.slug}`} title={x.name} className="block rounded-full ring-2 ring-background transition-transform hover:z-10 hover:-translate-y-0.5">
                      {x.photo ? (
                        <Image src={`/card/${x.photo}`} alt={x.name} width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="font-heading flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-extrabold text-white">
                          <span aria-hidden="true">{initials(x.name)}</span>
                          <span className="sr-only">{x.name}</span>
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-[13px] leading-snug text-muted-foreground">
                <span className="font-semibold text-foreground">{nameLine}</span> — expert admission strategists, on WhatsApp every day, 10 AM – 10 PM.
              </p>
            </div>
          </div>
        </div>

        {/* ------------------------------ the brand panel ------------------------------ */}
        <LoginShowcase
          eyebrow={c.eyebrow}
          title={c.title}
          accent={c.accent}
          subtitle={c.subtitle}
          stats={stats}
          steps={steps}
          notice={national ? { title: national.title, link: national.link } : null}
        />
      </section>

      {/* ------------------------------ every benefit, once ------------------------------ */}
      <section aria-labelledby="login-benefits" className="container-custom py-12 md:py-16">
        <h2 id="login-benefits" className="flex items-center gap-2 font-heading text-2xl font-extrabold tracking-tight text-foreground">
          <Sparkles className="h-5 w-5 text-primary-strong" aria-hidden="true" /> {c.benefits_title}
        </h2>
        <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(([t, d], i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <li key={t} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong ring-1 ring-primary/15">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">{t}</span>
                  <span className="mt-1 block text-[13.5px] leading-relaxed text-muted-foreground">{d}</span>
                </span>
              </li>
            );
          })}
        </ul>
        {c.trust && <p className="mt-8 text-[13px] text-muted-foreground">{c.trust}</p>}
      </section>
    </main>
  );
}
