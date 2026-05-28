"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import dynamic from 'next/dynamic';
import Footer from './Footer';

const LiveAlerts = dynamic(() => import('@/components/LiveAlerts'), {
  ssr: false,
});

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAdminSubdomain, setIsAdminSubdomain] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdminSubdomain(window.location.hostname.startsWith('admin.'));
    }
  }, []);

  const isAdminRoute = pathname?.startsWith('/admin') || isAdminSubdomain;

  if (isAdminRoute) {
    return <main className="w-full">{children}</main>;
  }

  return (
    <>
      <Header />
      <div className="fixed top-[72px] left-0 right-0 z-[35]">
        <LiveAlerts />
      </div>
      <main className="w-full" style={{ paddingTop: 'calc(72px + var(--alerts-height, 0px))' }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
