import React, { ReactNode } from 'react';
import { headers } from 'next/headers';
import AdminLayoutClient from './AdminLayoutClient';
import { isAdminSubdomain, getBaseWebsiteUrl } from '@/utils/envHelper';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const host = headers().get('host') || '';
  const isAdmin = isAdminSubdomain(host);

  return (
    <AdminLayoutClient isAdminSubdomain={isAdmin} baseWebsiteUrl={getBaseWebsiteUrl(host)}>
      {children}
    </AdminLayoutClient>
  );
}
