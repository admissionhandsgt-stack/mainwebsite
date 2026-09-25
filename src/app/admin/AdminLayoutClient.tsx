"use client";

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Users, Bell, Video, School, LogOut, ChevronRight, ImageIcon, GitBranch, Inbox, LayoutDashboard, SlidersHorizontal, MapPin, Menu, Search, MessageCircle, AlertTriangle, FileText } from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/admin/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { getBaseWebsiteUrl } from '@/utils/envHelper';

interface AdminLayoutClientProps {
  children: ReactNode;
  isAdminSubdomain: boolean;
  /** Where "Back to Website" goes. Resolved on the server so the markup matches. */
  baseWebsiteUrl: string;
}

// Grouped so the sidebar reads as "what am I here to do" rather than one flat
// list of tables. Leads first — it is the only section that is time-sensitive.
const navGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Callback Leads', href: '/admin/leads', icon: Inbox },
      { name: 'Documents', href: '/admin/documents', icon: FileText },
    ],
  },
  {
    label: 'Site content',
    items: [
      { name: 'Page Content', href: '/admin/content', icon: SlidersHorizontal },
      { name: 'Navigation', href: '/admin/navigation', icon: Menu },
      { name: 'Search & Sharing', href: '/admin/seo', icon: Search },
      { name: 'Live Alerts', href: '/admin/live-alerts', icon: Bell },
      { name: 'Videos', href: '/admin/videos', icon: Video },
      { name: 'Media', href: '/admin/media', icon: ImageIcon },
      { name: 'Contacts', href: '/admin/contacts', icon: Users },
      { name: 'WhatsApp Verify', href: '/admin/whatsapp', icon: MessageCircle },
      { name: 'Errors', href: '/admin/logs', icon: AlertTriangle },
    ],
  },
  {
    label: 'Colleges & data',
    items: [
      { name: 'UG Colleges', href: '/admin/colleges', icon: School },
      { name: 'PG Colleges', href: '/admin/pg-colleges', icon: School },
      { name: 'MBBS States', href: '/admin/mbbs-states', icon: MapPin },
      { name: 'PG Branches', href: '/admin/pg-branches', icon: GitBranch },
    ],
  },
];

function AdminSidebar({
  isAdminSubdomain,
  baseWebsiteUrl,
}: {
  isAdminSubdomain: boolean;
  baseWebsiteUrl: string;
}) {
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

        <div className="flex-1 flex flex-col pt-5 pb-3 overflow-y-auto relative z-10">
          {/* Logo & Profile */}
          <div className="flex flex-col px-4 mb-4">
            <Link href="/" className="group block mb-3 px-2">
              <img 
                src="/assets/images/logos/logo.avif" 
                alt="Admission Hands Logo" 
                className="h-9 object-contain w-auto group-hover:scale-98 transition-transform duration-300"
              />
            </Link>
            
            {/* User Session profile */}
            <div className="flex items-center gap-2 p-2 bg-medical-50/50 border border-medical-100/30 rounded-xl">
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

          <nav className="px-4 space-y-3.5 flex-1">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-2">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const targetHref = isAdminSubdomain ? item.href.replace(/^\/admin/, '') || '/' : item.href;
                  return (
                    <Link
                      key={item.name}
                      href={targetHref}
                      className="relative flex items-center px-3.5 py-2 rounded-xl transition-all duration-300 group overflow-hidden"
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
                          className={`mr-2.5 h-[18px] w-[18px] transition-colors duration-300 ${
                            active ? 'text-medical-600' : 'text-gray-400 group-hover:text-medical-400'
                          }`}
                        />
                        <span className={`font-medium text-sm transition-colors duration-300 ${
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
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-gray-100/50 p-3 space-y-1 relative z-10 bg-white/50">
          <a
            href={isAdminSubdomain ? baseWebsiteUrl : '/'}
            className="flex items-center px-3.5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-3 text-gray-400" />
            Back to Website
          </a>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="h-4 w-4 mr-3 text-red-500" />
            Secure Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminContent({
  children,
  isAdminSubdomain,
  baseWebsiteUrl,
}: {
  children: ReactNode;
  isAdminSubdomain: boolean;
  baseWebsiteUrl: string;
}) {
  const pathname = usePathname();

  /**
   * Which route is the login form.
   *
   * `/admin` is what the server sees; `/` is what the browser shows on the
   * admin subdomain, because the middleware rewrites the path and
   * `usePathname()` reports the URL the visitor is actually at. Both have to
   * count, and neither needs the host: this layout only wraps admin routes, so
   * a pathname of `/` here cannot be the marketing homepage.
   *
   * Reading the host instead made server and client disagree after hydration —
   * the login page was wrapped in ProtectedRoute, which found no session and
   * sat on "Redirecting to login…" forever.
   */
  const isLoginPage = pathname === '/admin' || pathname === '/';

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

        <AdminSidebar isAdminSubdomain={isAdminSubdomain} baseWebsiteUrl={baseWebsiteUrl} />

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

export default function AdminLayoutClient({
  children,
  isAdminSubdomain,
  baseWebsiteUrl,
}: AdminLayoutClientProps) {
  React.useEffect(() => {
    const html = document.documentElement;
    
    // Force light theme and light color scheme
    html.classList.remove('dark');
    if (!html.classList.contains('light')) {
      html.classList.add('light');
    }
    html.style.colorScheme = 'light';

    // Set up a MutationObserver to prevent next-themes from re-applying 'dark'
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            if (!html.classList.contains('light')) {
              html.classList.add('light');
            }
          }
        }
      });
    });

    observer.observe(html, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <AuthProvider>
      <AdminContent isAdminSubdomain={isAdminSubdomain} baseWebsiteUrl={baseWebsiteUrl}>
        {children}
      </AdminContent>
    </AuthProvider>
  );
}
