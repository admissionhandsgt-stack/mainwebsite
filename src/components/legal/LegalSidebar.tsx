"use client";

import { useCallback } from "react";

interface LegalSidebarProps {
  sections: Array<{
    slug: string;
    title: string;
  }>;
  activeSection: string;
  setActiveSection: (slug: string) => void;
}

export default function LegalSidebar({
  sections,
  activeSection,
  setActiveSection,
}: LegalSidebarProps) {

  const scrollTo = useCallback((id: string) => {
    setActiveSection(id);
    const contentEl = document.getElementById("legal-content-top");
    if (contentEl) {
      contentEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [setActiveSection]);

  return (
    <nav aria-label="Legal document navigation" className="w-full print:hidden">
      <ul className="space-y-3">
        {sections.map((section) => {
          const isSectionActive = activeSection === section.slug;

          return (
            <li key={section.slug}>
              <button
                type="button"
                onClick={() => scrollTo(section.slug)}
                className={`block w-full text-left text-[14px] py-2.5 px-4 rounded-xl transition-all duration-150 border-l-2 ${
                  isSectionActive
                    ? "bg-blue-50/50 dark:bg-blue-950/20 text-blue-650 dark:text-blue-400 font-bold border-blue-600"
                    : "text-slate-600 dark:text-slate-450 border-transparent hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50/30 dark:hover:bg-slate-900/30"
                }`}
              >
                {section.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
