"use client";
import React, { useState } from "react";
import Link from "@/components/ui/Link";

/** One notice, as the root layout reads it on the server. */
export interface BarAlert {
  id: number;
  title: string;
  link: string | null;
}

/**
 * The scrolling notice bar.
 *
 * It used to fetch its own alerts after hydration and set `--alerts-height`
 * from an effect, so on every page the content arrived at 72px, dropped to 112px
 * when the bar mounted, and went back up if nothing was active — a layout shift
 * on every visit, and a second round trip to Montreal for a few lines of text.
 * The layout now reads the alerts with the menus and passes them in; this
 * component only draws them, and SiteShell reserves the space from the same
 * data. The admin screen still uses useLiveAlerts for editing.
 */
export default function LiveAlerts({ alerts }: { alerts: BarAlert[] }) {
  const [isPaused, setIsPaused] = useState(false);
  const activeAlerts = alerts;

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div 
      className="live-alerts-container bg-gradient-brand text-white flex items-center shadow-md overflow-hidden py-2"
      style={{ zIndex: "var(--z-alerts, 35)" }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="container-custom flex items-center h-full w-full max-w-full relative">
        
        {/* Label block: sticky on the left */}
        <div className="flex items-center gap-1.5 px-2 md:px-3 h-7 bg-white text-primary-strong rounded-md shrink-0 z-10 shadow-sm font-black text-[12px] md:text-[10px] tracking-tight">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          UPDATES
        </div>

        {/* Ticker wrapper */}
        <div className="flex-grow overflow-hidden h-full flex items-center ml-3 md:ml-4 relative">
          <div 
            className={`flex whitespace-nowrap ${isPaused ? "pause-animation" : "animate-ticker"}`}
            style={{ animationDuration: `${Math.max(35, activeAlerts.length * 15)}s` }}
          >
            {[...activeAlerts, ...activeAlerts, ...activeAlerts].map((alert, idx) => (
              <div key={`${alert.id}-${idx}`} className="flex items-center mx-3 md:mx-4 group">
                <span className="text-white/60 mr-1.5 md:mr-2">⚲</span>
                <Link href={alert.link || "#"} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs md:text-sm font-medium hover:underline text-white/90 group-hover:text-white transition-colors">
                  {alert.title}
                </Link>
                <span className="ml-3 md:ml-4 text-white/30">|</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-ticker {
          animation: ticker linear infinite;
          will-change: transform;
        }
        .pause-animation {
          animation-play-state: paused;
        }
      `}} />
    </div>
  );
}
