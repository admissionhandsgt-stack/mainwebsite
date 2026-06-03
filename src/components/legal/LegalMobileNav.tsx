"use client";

import React, { useRef, useEffect } from "react";

interface LegalMobileNavProps {
  sections: Array<{
    slug: string;
    title: string;
  }>;
  activeSection: string;
  onSectionChange: (slug: string) => void;
}

export default function LegalMobileNav({
  sections,
  activeSection,
  onSectionChange,
}: LegalMobileNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the active tab into view horizontally
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeTab = container.querySelector('[data-active="true"]');
    if (!activeTab) return;

    const containerWidth = container.clientWidth;
    const tabOffsetLeft = (activeTab as HTMLElement).offsetLeft;
    const tabWidth = (activeTab as HTMLElement).clientWidth;

    container.scrollTo({
      left: tabOffsetLeft - containerWidth / 2 + tabWidth / 2,
      behavior: "smooth",
    });
  }, [activeSection]);

  return (
    <div className="w-full md:hidden print:hidden border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur sticky top-[72px] z-35 transition-colors duration-200">
      <div 
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2.5 px-4"
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
      >
        {sections.map((section) => {
          const isActive = activeSection === section.slug;

          return (
            <button
              key={section.slug}
              data-active={isActive ? "true" : "false"}
              onClick={() => onSectionChange(section.slug)}
              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 shrink-0 select-none ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 active:scale-95"
                  : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-98"
              }`}
            >
              {section.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
