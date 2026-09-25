"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

/**
 * A video that opens *here*, by zooming open over the page.
 *
 * Playing used to mean leaving — the poster took you to `/videos` and the
 * video started somewhere else, which throws away the page someone was
 * reading. This keeps them where they are: the poster scales up into a
 * centred theatre, plays, and closing puts the page back exactly as it was.
 *
 * **Nothing from YouTube loads until the play button is pressed.** An embed is
 * roughly a megabyte of third-party JavaScript, and it was loading on every
 * homepage visit for a video most people never play. The poster is a single
 * image; the iframe is mounted on click and unmounted on close, which also
 * stops the audio dead rather than leaving it playing behind a closed overlay.
 *
 * Portalled to `document.body` so no ancestor's `overflow` or stacking context
 * can clip it — the same reason `AuthDialog` is portalled.
 */
export default function VideoTheatre({
  videoId,
  title,
  open,
  onClose,
}: {
  videoId: string;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;

    returnFocus.current = document.activeElement as HTMLElement;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the panel, not the iframe: focusing the embed hands the next Tab
    // press to YouTube's own controls before the close button is reachable.
    panel.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      returnFocus.current?.focus?.();
    };
  }, [open, close]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            // The zoom: it grows out of the page rather than cutting to a new
            // screen, so it reads as the same video getting bigger.
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.86, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.7 }}
            className="relative w-full max-w-5xl outline-none"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close video"
              className="absolute -top-2 right-0 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:-right-2 sm:-top-14"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
              <div className="relative aspect-video">
                <iframe
                  // `autoplay=1` is honoured because this only ever mounts from
                  // a click — a user gesture, which is what browsers require.
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
            </div>

            <p className="mt-3 text-center text-[15px] font-semibold text-white/90 sm:text-left">
              {title}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
