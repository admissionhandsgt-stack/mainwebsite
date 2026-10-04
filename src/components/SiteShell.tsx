"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import { isAdminSubdomain as checkIsAdminSubdomain } from '@/utils/envHelper';
import type { NavItem } from '@/lib/content';

// Rendered with the page, not loaded after it. See the note in app/layout.tsx:
// a client-only bar arrived late and pushed every page down by its height.
import LiveAlerts, { type BarAlert } from '@/components/LiveAlerts';

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

interface SiteShellProps {
  /** First name of the signed-in visitor, or null when nobody is. */
  accountName?: string | null;
  children: React.ReactNode;
  /** Menus come from the root layout as plain data — this is a client tree. */
  headerNav?: NavItem[];
  footerExplore?: NavItem[];
  footerQuick?: NavItem[];
  footerTagline?: string;
  headerCtaLabel?: string;
  showThemeToggle?: boolean;
  social?: SocialLinks;
  alertsEnabled?: boolean;
  /** The active notices, read on the server. Empty means no bar and no gap for one. */
  alerts?: BarAlert[];
}

export default function SiteShell({
  children,
  accountName,
  headerNav,
  footerExplore,
  footerQuick,
  footerTagline,
  headerCtaLabel,
  showThemeToggle = true,
  social,
  alertsEnabled = true,
  alerts = [],
}: SiteShellProps) {
  const pathname = usePathname();
  const [isAdminSubdomain, setIsAdminSubdomain] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdminSubdomain(checkIsAdminSubdomain(window.location.hostname));
    }
  }, []);

  const isAdminRoute = pathname?.startsWith('/admin') || isAdminSubdomain;
  const showBar = alertsEnabled && alerts.length > 0;

  if (isAdminRoute) {
    return <main className="w-full">{children}</main>;
  }

  return (
    <>
      <Header nav={headerNav} ctaLabel={headerCtaLabel} showThemeToggle={showThemeToggle} accountName={accountName} />
      {showBar && (
        <div className="fixed top-[72px] left-0 right-0 z-[35]">
          <LiveAlerts alerts={alerts} />
        </div>
      )}
      {/* 72px header, plus the 40px bar only when there is one to show. Known on
          the server, so the first paint already has the right gap. */}
      <main className="w-full" style={{ paddingTop: showBar ? '112px' : '72px' }}>
        {children}
      </main>
      <Footer
        explore={footerExplore}
        quickLinks={footerQuick}
        tagline={footerTagline}
        social={social}
      />
    </>
  );
}
