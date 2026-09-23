"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import dynamic from 'next/dynamic';
import Footer from './Footer';
import { isAdminSubdomain as checkIsAdminSubdomain } from '@/utils/envHelper';
import type { NavItem } from '@/lib/content';

const LiveAlerts = dynamic(() => import('@/components/LiveAlerts'), {
  ssr: false,
});

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
}: SiteShellProps) {
  const pathname = usePathname();
  const [isAdminSubdomain, setIsAdminSubdomain] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdminSubdomain(checkIsAdminSubdomain(window.location.hostname));
    }
  }, []);

  const isAdminRoute = pathname?.startsWith('/admin') || isAdminSubdomain;

  if (isAdminRoute) {
    return <main className="w-full">{children}</main>;
  }

  return (
    <>
      <Header nav={headerNav} ctaLabel={headerCtaLabel} showThemeToggle={showThemeToggle} accountName={accountName} />
      {alertsEnabled && (
        <div className="fixed top-[72px] left-0 right-0 z-[35]">
          <LiveAlerts />
        </div>
      )}
      <main className="w-full" style={{ paddingTop: 'calc(72px + var(--alerts-height, 0px))' }}>
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
