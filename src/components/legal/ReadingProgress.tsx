"use client";

import { useEffect, useState } from "react";

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId: number | null = null;
    let ticking = false;

    const updateProgress = () => {
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        setProgress(Math.min((window.scrollY / scrollHeight) * 100, 100));
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(updateProgress);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateProgress();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
      className={`fixed top-0 left-0 z-50 h-[2px] print:hidden
        bg-gradient-to-r from-blue-500 to-indigo-500
        dark:from-blue-400 dark:to-indigo-400
        transition-[width] duration-150 ease-out
        motion-reduce:transition-none
        ${progress === 0 ? "opacity-0" : "opacity-100"}`}
      style={{ width: `${progress}%` }}
    />
  );
}
