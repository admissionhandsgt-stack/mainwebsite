"use client";

import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight, Users, Bell, Video, School, LogOut, ImageIcon, GitBranch, Inbox, LayoutDashboard,
  SlidersHorizontal, MapPin, Menu, Search, AlertTriangle, FileText, Megaphone, X, Settings2, MessageCircle, Database,
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/admin/ProtectedRoute';
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface AdminLayoutClientProps {
  children: ReactNode;
  isAdminSubdomain: boolean;
  /** Where "View website" goes. Resolved on the server so the markup matches. */
  baseWebsiteUrl: string;
}

type BadgeKey = 'leads' | 'whatsapp' | 'documents' | 'errors';
type Badges = Partial<Record<BadgeKey | 'follow_ups' | 'whatsapp_failed', number>>;

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: BadgeKey;
}

/**
 * Grouped by the job somebody opens the admin to do. "Today" is the work that
 * waits on a person — leads, chats, documents — and carries the counts; the
 * rest is the website, the data and the plumbing, in that order.
 */
const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Today',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Leads', href: '/admin/leads', icon: Inbox, badge: 'leads' },
      { name: 'WhatsApp Inbox', href: '/admin/whatsapp-log', icon: MessageCircle, badge: 'whatsapp' },
      { name: 'Documents', href: '/admin/documents', icon: FileText, badge: 'documents' },
    ],
  },
  {
    label: 'Website',
    items: [
      { name: 'Page content', href: '/admin/content', icon: SlidersHorizontal },
      { name: 'Navigation', href: '/admin/navigation', icon: Menu },
      { name: 'Search & sharing', href: '/admin/seo', icon: Search },
      { name: 'Live alerts', href: '/admin/live-alerts', icon: Bell },
      { name: 'Videos', href: '/admin/videos', icon: Video },
      { name: 'Media', href: '/admin/media', icon: ImageIcon },
      { name: 'Contacts', href: '/admin/contacts', icon: Users },
      { name: 'Outreach kit', href: '/admin/outreach', icon: Megaphone },
    ],
  },
  {
    label: 'Colleges & data',
    items: [
      { name: 'UG colleges', href: '/admin/colleges', icon: School },
      { name: 'PG colleges', href: '/admin/pg-colleges', icon: School },
      { name: 'MBBS states', href: '/admin/mbbs-states', icon: MapPin },
      { name: 'PG branches', href: '/admin/pg-branches', icon: GitBranch },
      { name: 'Data sync (NMC)', href: '/admin/data-sync', icon: Database },
    ],
  },
  {
    label: 'Settings',
    items: [
      { name: 'WhatsApp official API', href: '/admin/whatsapp-official', icon: WhatsAppIcon },
      { name: 'WhatsApp gateway (old)', href: '/admin/whatsapp', icon: Settings2 },
      { name: 'Errors', href: '/admin/logs', icon: AlertTriangle, badge: 'errors' },
    ],
  },
];

const BADGE_TONE: Record<BadgeKey, string> = {
  leads: 'bg-amber-500 text-white',
  whatsapp: 'bg-emerald-500 text-white',
  documents: 'bg-amber-500 text-white',
  errors: 'bg-red-500 text-white',
};

/** The counts beside the menu, refreshed every minute and whenever the page changes. */
function useBadges(pathname: string, enabled: boolean) {
  const [badges, setBadges] = useState<Badges>({});
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/badges', { cache: 'no-store' });
      if (r.ok) setBadges(await r.json());
    } catch {
      // A missing count must not break the menu.
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    load();
    const i = setInterval(load, 60_000);
    return () => clearInterval(i);
  }, [load, pathname, enabled]);
  return badges;
}

function Sidebar({
  isAdminSubdomain,
  baseWebsiteUrl,
  badges,
  onNavigate,
}: {
  isAdminSubdomain: boolean;
  baseWebsiteUrl: string;
  badges: Badges;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || '/';
  const { signOut, user } = useAuth();

  const target = (href: string) => (isAdminSubdomain ? href.replace(/^\/admin/, '') || '/' : href);
  const isActive = (href: string) => pathname.startsWith(target(href));

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-slate-100 px-5">
        <Link href={target('/admin/dashboard')} onClick={onNavigate} className="block">
          <img src="/assets/images/logos/logo.avif" alt="AdmissionHands admin" className="h-8 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Admin">
        {NAV.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const count = item.badge ? badges[item.badge] ?? 0 : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={target(item.href)}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${
                        active ? 'bg-cyan-50 text-cyan-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <item.icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-cyan-700' : 'text-slate-400'}`} />
                      <span className="flex-1 truncate">{item.name}</span>
                      {count > 0 && (
                        <span
                          className={`min-w-[1.375rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums ${BADGE_TONE[item.badge!]}`}
                        >
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-100 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
            {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900">{user?.name || 'Admin'}</span>
            <span className="block truncate text-xs text-slate-500" title={user?.email || ''}>
              {user?.email}
            </span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <a
            href={isAdminSubdomain ? baseWebsiteUrl : '/'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
          >
            <ArrowUpRight className="h-4 w-4" /> Website
          </a>
          <button
            onClick={() => signOut()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-[13px] font-medium text-red-600 hover:border-red-200 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminContent({ children, isAdminSubdomain, baseWebsiteUrl }: AdminLayoutClientProps) {
  const pathname = usePathname() || '/';
  const [drawer, setDrawer] = useState(false);
  const isLogin = pathname === '/admin' || pathname === '/';
  const badges = useBadges(pathname, !isLogin);

  // Close the phone menu on navigation and on Escape.
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

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
  if (isLogin) return <>{children}</>;

  const strip = (href: string) => (isAdminSubdomain ? href.replace(/^\/admin/, '') || '/' : href);
  const current = NAV.flatMap((g) => g.items).find((i) => pathname.startsWith(strip(i.href)));
  const today = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const waiting = (badges.leads ?? 0) + (badges.whatsapp ?? 0);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 lg:block">
          <Sidebar isAdminSubdomain={isAdminSubdomain} baseWebsiteUrl={baseWebsiteUrl} badges={badges} />
        </aside>

        {/* Phone and tablet drawer */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <button className="absolute inset-0 bg-slate-900/40" aria-label="Close menu" onClick={() => setDrawer(false)} />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
              <Sidebar
                isAdminSubdomain={isAdminSubdomain}
                baseWebsiteUrl={baseWebsiteUrl}
                badges={badges}
                onNavigate={() => setDrawer(false)}
              />
              <button
                onClick={() => setDrawer(false)}
                className="absolute right-3 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
            <button
              onClick={() => setDrawer(true)}
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
              {waiting > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-slate-900">{current?.name ?? 'Admin'}</div>
              <div className="hidden text-xs text-slate-500 sm:block">{today}</div>
            </div>
            {(badges.whatsapp_failed ?? 0) > 0 && (
              <Link
                href={strip('/admin/whatsapp-log')}
                className="hidden items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 sm:inline-flex"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> {badges.whatsapp_failed} WhatsApp failed today
              </Link>
            )}
          </header>

          <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function AdminLayoutClient({ children, isAdminSubdomain, baseWebsiteUrl }: AdminLayoutClientProps) {
  // The admin is light-only: force it, and keep next-themes from switching it back.
  useEffect(() => {
    const html = document.documentElement;
    const light = () => {
      html.classList.remove('dark');
      html.classList.add('light');
      html.style.colorScheme = 'light';
    };
    light();
    const observer = new MutationObserver(() => html.classList.contains('dark') && light());
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <AuthProvider>
      <AdminContent isAdminSubdomain={isAdminSubdomain} baseWebsiteUrl={baseWebsiteUrl}>
        {children}
      </AdminContent>
    </AuthProvider>
  );
}
