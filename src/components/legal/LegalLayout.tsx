"use client";

import React, { useState, useCallback, useEffect } from 'react';
import ReadingProgress from '@/components/legal/ReadingProgress';
import LegalSidebar from '@/components/legal/LegalSidebar';
import LegalMobileNav from '@/components/legal/LegalMobileNav';
import LegalContent from '@/components/legal/LegalContent';

interface LegalHeading {
  id: string;
  text: string;
  level: number;
}

interface SectionData {
  slug: string;
  title: string;
  content: string;
  lastUpdated: string;
  headings: LegalHeading[];
}

interface LegalLayoutProps {
  sections: SectionData[];
}

export default function LegalLayout({ sections }: LegalLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>('terms');

  /**
   * Open the document the link asked for.
   *
   * Every legal document lives on this one page as a tab, so the footer's
   * "Privacy" link landed on Terms — three differently-labelled links leading
   * to the same text, on a site that collects phone numbers under DPDP. The
   * hash now selects the tab, so `/terms#privacy` opens the Privacy Policy.
   *
   * Read on mount and on `hashchange`, because the tab is state: a link from
   * another page arrives with the hash already set, a link from this page only
   * changes it.
   */
  useEffect(() => {
    const pick = () => {
      const slug = decodeURIComponent(window.location.hash.replace(/^#/, '')).trim();
      if (slug && sections.some((s) => s.slug === slug)) setActiveSection(slug);
    };
    pick();
    window.addEventListener('hashchange', pick);
    return () => window.removeEventListener('hashchange', pick);
  }, [sections]);

  // Handle active section change (from sidebar click)
  const handleSectionChange = useCallback((slug: string) => {
    setActiveSection(slug);
    // Keep the URL honest, so the document someone is reading is the one they
    // can send to somebody else. `replaceState` rather than a push: the tabs
    // are one page, and the back button should leave it.
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${slug}`);
    }
    
    // Scroll window back to top of the content pane smoothly
    const contentEl = document.getElementById('legal-content-top');
    if (contentEl) {
      contentEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const sidebarSections = sections.map((s) => ({
    slug: s.slug,
    title: s.title,
  }));

  // We filter the content to ONLY render the active section!
  const activeContentSections = sections.filter((s) => s.slug === activeSection);

  const lastModified = sections.reduce((latest, s) => {
    const d = new Date(s.lastUpdated);
    return d > latest ? d : latest;
  }, new Date(0));

  return (
    <>
      <ReadingProgress />

      {/* Skip to content */}
      <a
        href="#legal-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-20 focus:left-4 focus:z-50 focus:bg-white focus:dark:bg-slate-800 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium focus:text-cyan-600"
      >
        Skip to legal content
      </a>

      <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-200">
        {/* Page header */}
        <header className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 print:border-b-0">
          <div className="max-w-[var(--page-max)] mx-auto px-4 sm:px-6 lg:px-8 pt-3.5 pb-6 md:pt-4 md:pb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Legal Information
                </h1>
              </div>
              <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Last updated{' '}
                <time dateTime={lastModified.toISOString()}>
                  {lastModified.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </time>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile navigation - sticky horizontal tab bar */}
        <LegalMobileNav 
          sections={sidebarSections} 
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />

        {/* Main layout */}
        <div className="max-w-[var(--page-max)] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex relative">
            {/* Sidebar — desktop only */}
            <div className="hidden md:block flex-shrink-0 w-72 border-r border-slate-100 dark:border-slate-800/60 pr-8 pt-3 pb-8 print:hidden">
              <div className="sticky top-24">
                <LegalSidebar 
                  sections={sidebarSections} 
                  activeSection={activeSection}
                  setActiveSection={handleSectionChange}
                />
              </div>
            </div>

            {/* Main content */}
            <main
              id="legal-content"
              className="flex-1 min-w-0 pl-0 md:pl-12 pt-3 pb-8 max-w-4xl"
              role="main"
              aria-label="Legal documents"
            >
              {/* Invisible anchor to scroll back to content top when switching tabs */}
              <div id="legal-content-top" className="scroll-mt-24" />
              <LegalContent sections={activeContentSections} />
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
