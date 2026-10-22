"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import { isAdminSubdomain as checkIsAdminSubdomain } from '@/utils/envHelper';
import type { NavItem } from '@/lib/content';

// Rendered with the page, not loaded after it. See the note in app/layout.tsx:
// a client-only bar arrived late and pushed every page down by its height.
import LiveAlerts, { type BarAlert } from '@/components/LiveAlerts';
import EngagementLayer from '@/components/engage/EngagementLayer';
import ClickTracker from '@/components/analytics/ClickTracker';
import SiteSearch from '@/components/SiteSearch';
import { TeamFiguresProvider, type TeamFigures } from '@/components/engage/TeamFigures';
import { TelegramProvider, type TelegramCopy } from '@/components/engage/TelegramLink';

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  /** The Google Business Profile — the footer's address links to it. */
  google?: string;
}

interface SiteShellProps {
  /** First name of the signed-in visitor, or null when nobody is. */
  accountName?: string | null;
  /** Signed in, but the profile is missing an essential — show the resume pop-up. */
  resumeProfile?: boolean;
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
  /** The Telegram channel's address and invite copy, from the admin's settings. */
  telegram?: Partial<TelegramCopy>;
  /** The team's own figures (students guided, years), from the admin's settings. */
  teamFigures?: Partial<TeamFigures>;
}

export default function SiteShell({
  children,
  accountName,
  resumeProfile = false,
  headerNav,
  footerExplore,
  footerQuick,
  footerTagline,
  headerCtaLabel,
  showThemeToggle = true,
  social,
  alertsEnabled = true,
  alerts = [],
  telegram,
  teamFigures,
}: SiteShellProps) {
  const pathname = usePathname();
  const [isAdminSubdomain, setIsAdminSubdomain] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

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
    <TelegramProvider copy={telegram}>
    <TeamFiguresProvider figures={teamFigures}>
      <Header nav={headerNav} ctaLabel={headerCtaLabel} showThemeToggle={showThemeToggle} accountName={accountName} onSearch={openSearch} />
      <SiteSearch open={searchOpen} onOpen={openSearch} onClose={closeSearch} nav={headerNav ?? []} />
      {showBar && (
        <div className="fixed top-[72px] left-0 right-0 z-[35]">
          <LiveAlerts alerts={alerts} />
        </div>
      )}
      {/* 72px header, plus the 40px bar only when there is one to show. Known on
          the server, so the first paint already has the right gap. */}
      {/* --site-top: the fixed header (and the alerts bar) a sticky element has to clear. */}
      <main
        className="w-full"
        style={{ paddingTop: showBar ? '112px' : '72px', ['--site-top' as string]: showBar ? '112px' : '72px' }}
      >
        {children}
      </main>
      <Footer
        explore={footerExplore}
        quickLinks={footerQuick}
        tagline={footerTagline}
        social={social}
      />
      <ClickTracker />
      <EngagementLayer
        signedIn={Boolean(accountName)}
        firstName={accountName && accountName !== 'Account' ? accountName : null}
        resumeProfile={resumeProfile}
        alerts={showBar ? alerts : []}
      />
    </TeamFiguresProvider>
    </TelegramProvider>
  );
}
