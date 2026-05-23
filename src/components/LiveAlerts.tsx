"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveAlerts } from "@/hooks/useLiveAlerts";

export default function LiveAlerts() {
  const [isPaused, setIsPaused] = useState(false);
  const { alerts, isLoading, error, fetchAlerts } = useLiveAlerts();

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeAlerts = alerts.filter(alert => alert.is_active);

  useEffect(() => {
    const hasAlerts = activeAlerts.length > 0;
    const shouldShow = hasAlerts || isLoading || error;
    if (shouldShow) {
      document.documentElement.style.setProperty('--alerts-height', '40px');
    } else {
      document.documentElement.style.setProperty('--alerts-height', '0px');
    }
    return () => {
      document.documentElement.style.setProperty('--alerts-height', '0px');
    };
  }, [activeAlerts.length, isLoading, error]);

  if (error) {
    return null;
  }

  if (isLoading) {
    return (
      <div 
        className="live-alerts-container bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white flex items-center shadow-md overflow-hidden py-2"
        style={{ zIndex: "var(--z-alerts, 35)" }}
      >
        <div className="container-custom flex items-center h-full w-full max-w-full relative gap-4">
          <div className="h-6 w-20 bg-blue-500/50 rounded animate-pulse shrink-0"></div>
          <div className="h-4 w-64 bg-blue-500/40 rounded animate-pulse"></div>
          <div className="h-4 w-48 bg-blue-500/30 rounded animate-pulse hidden md:block"></div>
        </div>
      </div>
    );
  }

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div 
      className="live-alerts-container bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white flex items-center shadow-md overflow-hidden py-2"
      style={{ zIndex: "var(--z-alerts, 35)" }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="container-custom flex items-center h-full w-full max-w-full relative">
        
        {/* Label block: sticky on the left */}
        <div className="flex items-center gap-1.5 px-2 md:px-3 h-7 bg-white text-blue-700 rounded-md shrink-0 z-10 shadow-sm font-black text-[9px] md:text-[10px] tracking-tight">
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
                <Link href={alert.link || "#"} className="text-xs md:text-sm font-medium hover:underline text-white/90 group-hover:text-white transition-colors">
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
