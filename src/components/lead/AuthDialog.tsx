"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import UnlockCard from "@/components/lead/UnlockCard";

/**
 * Signing in without leaving the page.
 *
 * The form used to sit open underneath the results, which made a search look
 * like it had ended in a form. A search should end in an answer; the sign-in
 * is an interruption, and an interruption belongs in a dialog you can dismiss.
 *
 * Keeping it on the page also keeps the search: rank, category and filters are
 * all still there when the dialog closes, so the results simply appear.
 *
 * Portalled to `document.body` so no ancestor's `overflow` or stacking context
 * can clip it — a modal rendered inside a scrolling results panel is a modal
 * that sometimes cannot be seen.
 */
export default function AuthDialog({
  open,
  onClose,
  onUnlocked,
  lockedCount,
  level,
  rank,
  category,
  noun = "seats",
  alreadyShown = false,
}: {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
  lockedCount: number;
  level: "ug" | "pg";
  rank: number;
  category: string;
  noun?: string;
  alreadyShown?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;

    returnFocus.current = document.activeElement as HTMLElement;

    // Escape closes, and Tab is kept inside — a dialog you can tab out of
    // leaves a keyboard user lost behind it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);

    // Stop the page behind scrolling under the dialog.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the panel rather than the first field: opening straight into a
    // text input pops the keyboard on a phone before the heading is read.
    panel.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      returnFocus.current?.focus?.();
    };
  }, [open, close]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto overscroll-contain bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        tabIndex={-1}
        className="relative w-full max-w-xl rounded-t-3xl bg-background shadow-2xl outline-none sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* The heading the dialog is labelled by lives inside UnlockCard, so
            this one is for assistive tech only and never duplicated on screen. */}
        <h2 id="auth-dialog-title" className="sr-only">
          Sign in to see your {noun}
        </h2>

        <UnlockCard
          lockedCount={lockedCount}
          level={level}
          rank={rank}
          category={category}
          noun={noun}
          alreadyShown={alreadyShown}
          bare
          onUnlocked={() => {
            onUnlocked();
            close();
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
