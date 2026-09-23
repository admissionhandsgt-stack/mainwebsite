import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { currentUser } from "@/lib/userAuth";
import PageHero from "@/components/ui/PageHero";
import UnlockCard from "@/components/lead/UnlockCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in | AdmissionHands",
  robots: { index: false, follow: false },
};

/**
 * Signing in and signing up are the same screen.
 *
 * There is no password, so nothing distinguishes a returning visitor from a
 * new one until the number is entered — and once it is, we already know.
 * Asking someone to choose "login" or "register" first would be asking them a
 * question only we can answer.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  if (await currentUser()) {
    // Only ever bounce to our own paths. `next` comes from the URL, and a
    // value like `//evil.com` would make this an open redirect.
    const next = searchParams.next;
    redirect(next && /^\/[^/]/.test(next) ? next : "/account");
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHero
        eyebrow="Sign in"
        eyebrowIcon="target"
        title="One number."
        titleAccent="No password to forget."
        subtitle="Your phone number is your account. Confirm it on WhatsApp and everything opens — the full seat list, the round-by-round movement, and your rank saved for next time."
        image="/assets/images/hero/neet-hero.avif"
        tone="dark"
      />

      <div className="container-custom py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          <UnlockCard lockedCount={0} level="pg" rank={0} category="" noun="seats" />

          <ul className="mx-auto mt-8 max-w-[54ch] space-y-2.5 text-[14px] leading-relaxed text-muted-foreground">
            {[
              "New here? Entering your number creates the account. There is no separate sign-up.",
              "Been here before? The same number signs you back in.",
              "We never message you first — you message us, and that is what proves the number.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
