import React, { ReactNode } from 'react';
import { headers } from 'next/headers';
import AdminLayoutClient from './AdminLayoutClient';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const host = headers().get('host') || '';
  const isAdminSubdomain = host.startsWith('admin.');

  return (
    <AdminLayoutClient isAdminSubdomain={isAdminSubdomain}>
      {children}
    </AdminLayoutClient>
  );
}
