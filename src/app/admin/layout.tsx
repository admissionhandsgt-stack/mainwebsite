"use client";

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Users, Bell, Video, School, LogOut, ChevronRight, LayoutDashboard } from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/admin/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/sonner';

interface AdminLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Live Alerts', href: '/admin/live-alerts', icon: Bell },
  { name: 'UG Colleges', href: '/admin/colleges', icon: School },
  { name: 'PG Colleges', href: '/admin/pg-colleges', icon: School },
  { name: 'Contacts', href: '/admin/contacts', icon: Users },
  { name: 'Videos', href: '/admin/videos', icon: Video },
];

function AdminSidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-20">
      <div className="flex-1 flex flex-col min-h-0 bg-white/80 backdrop-blur-xl border-r border-white shadow-xl shadow-medical-900/5 m-4 rounded-3xl overflow-hidden relative">

        {/* Decorative glow */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-medical-100/50 to-transparent pointer-events-none" />

        <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto relative z-10">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 mb-8">
            <Link href="/" className="group flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-medical-600 to-teal-500 flex items-center justify-center shadow-lg shadow-medical-500/20 group-hover:shadow-medical-500/40 transition-all duration-300">
                <span className="text-white font-bold text-xl leading-none">A</span>
              </div>
              <div>
                <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-medical-900 to-medical-600 block">
                  Admin Panel
                </span>
                <span className="text-xs text-gray-400 truncate max-w-[130px] block">{user?.email}</span>
              </div>
            </Link>
          </div>

          <nav className="px-4 space-y-1 flex-1">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Management</div>
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="relative flex items-center px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden"
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-gradient-to-r from-medical-50 to-teal-50/50 border border-medical-100/50 rounded-xl"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <div className="relative z-10 flex items-center w-full">
                    <item.icon
                      className={`mr-3 h-5 w-5 transition-colors duration-300 ${
                        active ? 'text-medical-600' : 'text-gray-400 group-hover:text-medical-400'
                      }`}
                    />
                    <span className={`font-medium transition-colors duration-300 ${
                      active ? 'text-medical-900' : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                      {item.name}
                    </span>

                    {active && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-auto"
                      >
                        <ChevronRight className="h-4 w-4 text-medical-500" />
                      </motion.div>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-gray-100/50 p-4 space-y-2 relative z-10 bg-white/50">
          <Link
            href="/"
            className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-3 text-gray-400" />
            Back to Website
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="h-4 w-4 mr-3 text-red-500" />
            Secure Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin';

  if (isLoginPage) {
    // Login page: no sidebar, no protection
    return <>{children}</>;
  }

  // All other admin pages: protected with sidebar
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#F8FAFC] flex relative overflow-hidden">
        {/* Background Blobs */}
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-medical-200/20 blur-[120px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-200/20 blur-[120px] pointer-events-none" />

        <AdminSidebar />

        {/* Main content area */}
        <div className="md:pl-72 flex flex-col flex-1 w-full relative z-10">
          <main className="flex-1 p-4 md:p-8 pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    // AuthProvider wraps EVERYTHING — login page and protected pages share same auth context
    <AuthProvider>
      <AdminContent>{children}</AdminContent>
    </AuthProvider>
  );
}
