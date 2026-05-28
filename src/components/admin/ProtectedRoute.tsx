"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect after auth loading is complete and user is confirmed null
    if (!loading && !user) {
      const isSubdomain = typeof window !== 'undefined' && window.location.hostname.startsWith('admin.');
      router.replace(isSubdomain ? '/' : '/admin');
    }
  }, [user, loading, router]);

  // Still loading — show spinner, don't flash redirect
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-medical-600">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — will redirect, show nothing
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-medical-600">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Authenticated — render children
  return <>{children}</>;
};
