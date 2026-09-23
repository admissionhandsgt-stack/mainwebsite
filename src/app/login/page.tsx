import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { currentUser } from "@/lib/userAuth";
import PageHero from "@/components/ui/PageHero";
import LoginFlow from "@/components/auth/LoginFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in | AdmissionHands",
  robots: { index: false, follow: false },
};

/**
 * Signing in and signing up are the same screen.
 *
 * Nothing distinguishes a returning visitor from a new one until the number is
 * entered — and once it is, we already know which they are. Asking someone to
 * pick "login" or "register" first is asking them a question only we can
 * answer, and half of them get it wrong.
 */
/** The three things somebody standing on this page needs to know. */
const POINTS = [
  { icon: Smartphone, text: "New here? Your number creates the account — there is no separate sign-up form." },
  { icon: KeyRound, text: "Been here before? Your number and password, and you are straight in." },
  {
    icon: ShieldCheck,
    text: "The code is sent once, to prove the number is yours. Forgotten your password? Another code resets it.",
  },
];

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
        title="Your number is your account."
        titleAccent="Verified once, then you are in."
        subtitle="Enter your mobile number and we will send a code to it on WhatsApp. Set a password after that and next time it is just two fields — from a laptop or a phone, either way."
        image="/assets/images/hero/neet-hero.avif"
        tone="dark"
      />

      <div className="container-custom py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          <LoginFlow next={searchParams.next} />

          <ul className="mx-auto mt-8 max-w-[56ch] space-y-3 text-[14px] leading-relaxed text-muted-foreground">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
