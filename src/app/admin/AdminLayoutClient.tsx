"use client";

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Users, Bell, Video, School, LogOut, ChevronRight, ImageIcon, GitBranch, Inbox } from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/admin/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminLayoutClientProps {
  children: ReactNode;
  isAdminSubdomain: boolean;
}

const navigation = [
  { name: 'Callback Leads', href: '/admin/leads', icon: Inbox },
  { name: 'Live Alerts', href: '/admin/live-alerts', icon: Bell },
  { name: 'UG Colleges', href: '/admin/colleges', icon: School },
  { name: 'PG Colleges', href: '/admin/pg-colleges', icon: School },
  { name: 'Contacts', href: '/admin/contacts', icon: Users },
  { name: 'Videos', href: '/admin/videos', icon: Video },
  { name: 'Media', href: '/admin/media', icon: ImageIcon },
  { name: 'PG Branches', href: '/admin/pg-branches', icon: GitBranch },
];

function AdminSidebar({ isAdminSubdomain }: { isAdminSubdomain: boolean }) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  const isActive = (path: string) => {
    const matchPath = isAdminSubdomain ? path.replace(/^\/admin/, '') || '/' : path;
    const currentPath = pathname || '/';
    return matchPath === '/' ? currentPath === '/' : currentPath.startsWith(matchPath);
  };

  return (
    <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-20">
      <div className="flex-1 flex flex-col min-h-0 bg-white/80 backdrop-blur-xl border-r border-white shadow-xl shadow-medical-900/5 m-4 rounded-3xl overflow-hidden relative">

        {/* Decorative glow */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-medical-100/50 to-transparent pointer-events-none" />

        <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto relative z-10">
          {/* Logo & Profile */}
          <div className="flex flex-col px-4 mb-6">
            <Link href="/" className="group block mb-4 px-2">
              <img 
                src="/assets/images/logos/logo-4k.avif" 
                alt="Admission Hands Logo" 
                className="h-10 object-contain w-auto group-hover:scale-98 transition-transform duration-300"
              />
            </Link>
            
            {/* User Session profile */}
            <div className="flex items-center gap-2 p-2.5 bg-medical-50/50 border border-medical-100/30 rounded-2xl">
              <div className="w-7 h-7 rounded-full bg-medical-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm shadow-medical-500/20">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black text-medical-800 tracking-wider uppercase block leading-none mb-1">
                  Admin Active
                </span>
                <span className="text-[10.5px] text-gray-500 block font-medium break-all whitespace-normal leading-tight" title={user?.email || ''}>
                  {user?.email || 'admin@admissionhands.com'}
                </span>
              </div>
            </div>
          </div>

          <nav className="px-4 space-y-1 flex-1">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Management</div>
            {navigation.map((item) => {
              const active = isActive(item.href);
              const targetHref = isAdminSubdomain ? item.href.replace(/^\/admin/, '') || '/' : item.href;
              return (
                <Link
                  key={item.name}
                  href={targetHref}
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
          <a
            href={isAdminSubdomain ? (process.env.NODE_ENV === 'production' ? 'https://admissionhands.com' : 'http://localhost:3000') : '/'}
            className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-3 text-gray-400" />
            Back to Website
          </a>
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

function AdminContent({ children, isAdminSubdomain }: { children: ReactNode; isAdminSubdomain: boolean }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin' || (isAdminSubdomain && pathname === '/');

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

        <AdminSidebar isAdminSubdomain={isAdminSubdomain} />

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

export default function AdminLayoutClient({ children, isAdminSubdomain }: AdminLayoutClientProps) {
  return (
    <AuthProvider>
      <AdminContent isAdminSubdomain={isAdminSubdomain}>{children}</AdminContent>
    </AuthProvider>
  );
}
