import React, { ReactNode } from 'react';
import { headers } from 'next/headers';
import AdminLayoutClient from './AdminLayoutClient';
import { isAdminSubdomain, getBaseWebsiteUrl } from '@/utils/envHelper';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const host = (await headers()).get('host') || '';
  const isAdmin = isAdminSubdomain(host);

  return (
    <AdminLayoutClient isAdminSubdomain={isAdmin} baseWebsiteUrl={getBaseWebsiteUrl(host)}>
      {children}
    </AdminLayoutClient>
  );
}
