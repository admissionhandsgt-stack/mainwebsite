"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthFlow from "@/components/auth/AuthFlow";
import { safeNext } from "@/lib/safeNext";

/**
 * `AuthFlow` on its own page, where finishing means going somewhere — with two tabs since 2026-11-10 (owner: "Sign Up &
 * login alag sa hona chaiye"): "Sign in" asks for the number alone (then password or a code), "Create free account"
 * asks for number, name, rank and category. One AuthFlow underneath, so a number typed on one tab is still there on the
 * other, and the sign-in tab sends a number it does not know to the other tab instead of texting a stranger a code.
 *
 * `router.refresh()` before the push is what makes the destination render as signed in. The session cookie was set on
 * the sign-in response, but the server components already in the router cache were rendered for somebody signed out.
 */
export default function LoginFlow({ next, initialMode = "signin" }: { next?: string; initialMode?: "signin" | "signup" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  // Only our own paths. `next` comes from the URL — the same helper the page uses.
  const target = safeNext(next);

  const tab = (m: "signin" | "signup", label: React.ReactNode) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
        mode === m ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div role="tablist" aria-label="Sign in or create an account" className="mb-4 flex gap-1 rounded-2xl bg-surface-2 p-1">
        {tab("signin", "Sign in")}
        {tab(
          "signup",
          <>
            <span className="sm:hidden">Create account</span>
            <span className="hidden sm:inline">Create free account</span>
          </>,
        )}
      </div>
      <AuthFlow
        noun="account"
        plain
        mode={mode}
        onSwitchMode={setMode}
        onDone={() => {
          router.refresh();
          router.push(target);
        }}
      />
    </div>
  );
}
