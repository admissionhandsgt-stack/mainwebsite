import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Phone, Target, LogOut, Search, TrendingDown } from "lucide-react";
import { currentUser } from "@/lib/userAuth";
import PageHero from "@/components/ui/PageHero";
import SignOutButton from "@/components/account/SignOutButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account | AdmissionHands",
  // Nothing here should ever appear in a search result.
  robots: { index: false, follow: false },
};

const num = (n: number | null | undefined) => (n == null ? null : n.toLocaleString("en-IN"));

/**
 * What an account is actually for.
 *
 * Not a profile page for its own sake — it holds the two things a student
 * re-types on every visit (their rank and category) and hands them straight
 * back to the tools, so the second visit is faster than the first.
 */
export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");

  const level = user.level ?? "pg";
  const predictor = level === "ug" ? "/mbbs-india/predictor" : "/md-ms-india/predictor";
  const rounds = level === "ug" ? "/mbbs-india/rounds" : "/md-ms-india/rounds";
  const rankQuery = user.rank ? `?rank=${user.rank}${user.category ? `&category=${user.category}` : ""}` : "";

  return (
    <main className="min-h-screen bg-background">
      <PageHero
        eyebrow="Your account"
        eyebrowIcon="target"
        title={user.name ? `Welcome back, ${user.name.split(" ")[0]}.` : "Welcome back."}
        titleAccent={user.rank ? `Rank ${num(user.rank)} is saved.` : "Save a rank to pick up faster."}
        subtitle="Your rank and category are kept here so the tools open where you left off, and so we are not asking you the same thing every visit."
        image="/assets/images/hero/neet-hero.avif"
        tone="dark"
      />

      <div className="container-custom py-10 md:py-14">
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          {/* ---- who you are ---- */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-bold text-foreground">Your details</h2>

            <dl className="mt-4 space-y-3 text-[15px]">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <dt className="sr-only">Phone</dt>
                <dd className="tnum text-foreground">{user.phone}</dd>
                {user.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    Verified
                  </span>
                )}
              </div>

              {user.name && (
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <dt className="sr-only">Name</dt>
                  <dd className="text-foreground">{user.name}</dd>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <dt className="sr-only">Saved rank</dt>
                <dd className="text-foreground">
                  {user.rank ? (
                    <>
                      <span className="tnum font-semibold">{num(user.rank)}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {user.category ?? "—"} · NEET {level.toUpperCase()}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No rank saved yet</span>
                  )}
                </dd>
              </div>
            </dl>

            {!user.verified && (
              <p className="mt-5 rounded-xl border border-border bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
                Your number has not been confirmed on WhatsApp. It still works — this only means we
                have not had a message from it.
              </p>
            )}

            <div className="mt-6 border-t border-border pt-5">
              <SignOutButton />
            </div>
          </section>

          {/* ---- where to go next ---- */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-bold text-foreground">Pick up where you left off</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
              {user.rank
                ? "Both tools open with your saved rank already filled in."
                : "Run a search and your rank will be saved here automatically."}
            </p>

            <div className="mt-5 space-y-3">
              <Link
                href={predictor + rankQuery}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3.5 transition-colors hover:border-primary/40"
              >
                <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="flex-grow">
                  <span className="block text-[15px] font-semibold text-foreground">Seat predictor</span>
                  <span className="block text-[13px] text-muted-foreground">
                    Every seat your rank reaches, in four bands
                  </span>
                </span>
              </Link>

              <Link
                href={rounds + rankQuery}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3.5 transition-colors hover:border-primary/40"
              >
                <TrendingDown className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="flex-grow">
                  <span className="block text-[15px] font-semibold text-foreground">After round 1</span>
                  <span className="block text-[13px] text-muted-foreground">
                    What opened up, and what closed tighter
                  </span>
                </span>
              </Link>
            </div>
          </section>
        </div>

        <p className="mx-auto mt-8 max-w-[64ch] text-center text-[13px] leading-relaxed text-muted-foreground">
          <LogOut className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          Signing out removes this session from our servers, not just from this browser.
        </p>
      </div>
    </main>
  );
}
