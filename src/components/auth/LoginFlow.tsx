"use client";

import { useRouter } from "next/navigation";
import AuthFlow from "@/components/auth/AuthFlow";
import { safeNext } from "@/lib/safeNext";

/**
 * `AuthFlow` on its own page, where finishing means going somewhere.
 *
 * Exists because `/login` is a server component and cannot hand a callback to a
 * client one. It is also the only place that knows what to do afterwards: in a
 * dialog the answer is "close and show the results", here it is "go to the page
 * they were trying to reach".
 *
 * `router.refresh()` before the push is what makes the destination render as
 * signed in. The session cookie was set on the sign-in response, but the server
 * components already in the router cache were rendered for somebody signed out
 * — without the refresh, the account page would redirect straight back here.
 */
export default function LoginFlow({ next }: { next?: string }) {
  const router = useRouter();

  // Only our own paths. `next` comes from the URL — the same helper the page uses.
  const target = safeNext(next);

  return (
    <AuthFlow
      noun="account"
      onDone={() => {
        router.refresh();
        router.push(target);
      }}
    />
  );
}
