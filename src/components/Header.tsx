"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, ChevronDown, ChevronRight, Sun, Moon, UserRound } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCTA } from '@/hooks/useCTA';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

import type { NavItem } from '@/lib/content';

/** What renders if the nav_items table is empty or unreachable. */
const FALLBACK_NAV: NavItem[] = [
  { id: -1, label: 'Home', url: '/', newTab: false, children: [] },
  {
    id: -2, label: 'MBBS India', url: '/mbbs-india', newTab: false,
    children: [
      { id: -21, label: 'Deemed Universities', url: '/mbbs-india/deemed-universities', newTab: false, children: [] },
      { id: -22, label: 'Govt & Pvt Colleges', url: '/mbbs-india/colleges', newTab: false, children: [] },
      { id: -23, label: 'NEET UG Process', url: '/neet-ug-process', newTab: false, children: [] },
    ],
  },
  {
    id: -3, label: 'PG – MD/MS', url: '/md-ms-india', newTab: false,
    children: [
      { id: -31, label: 'College Predictor', url: '/neet-college-predictor', newTab: false, children: [] },
      { id: -32, label: 'All PG Colleges', url: '/md-ms-india/colleges', newTab: false, children: [] },
      { id: -33, label: 'Closing Ranks', url: '/md-ms-india/cutoffs', newTab: false, children: [] },
    ],
  },
  { id: -4, label: 'Services', url: '/services', newTab: false, children: [] },
  { id: -5, label: 'Know Us', url: '/know-us', newTab: false, children: [] },
  { id: -6, label: 'Terms', url: '/terms', newTab: false, children: [] },
];

export default function Header({
  nav,
  ctaLabel,
  showThemeToggle = true,
  accountName,
}: {
  nav?: NavItem[];
  ctaLabel?: string;
  showThemeToggle?: boolean;
  /** First name when signed in, null when not. Decides Sign in vs Account. */
  accountName?: string | null;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Keyed by item id: one shared flag meant opening MBBS also opened PG.
  const [expanded, setExpanded] = useState<number | null>(null);
  const pathname = usePathname();
  const CTA = useCTA();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // The bar starts flush with the hero and gains a surface once you leave it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('no-scroll');
      window.dispatchEvent(new CustomEvent('mobileMenuToggle', { detail: { open: true } }));
    } else {
      document.body.classList.remove('no-scroll');
      window.dispatchEvent(new CustomEvent('mobileMenuToggle', { detail: { open: false } }));
    }
    return () => {
      document.body.classList.remove('no-scroll');
      window.dispatchEvent(new CustomEvent('mobileMenuToggle', { detail: { open: false } }));
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setExpanded(null);
  }, [pathname]);

  const navLinks = nav?.length ? nav : FALLBACK_NAV;

  const renderThemeToggle = () => {
    if (!showThemeToggle) return null;
    if (!mounted) {
      return (
        <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800/40 animate-pulse shrink-0" />
      );
    }
    return (
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="w-11 h-11 rounded-full flex items-center justify-center text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors shrink-0"
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>
    );
  };

  return (
    <>
      <header
        data-site-header
        className={`fixed top-0 left-0 right-0 w-full z-[100] transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/70 shadow-sm'
            : 'bg-background/40 backdrop-blur-md border-b border-transparent'
        }`}
      >
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
          {/* Extreme Left: Logo */}
          <Link href="/" className="flex min-h-[44px] items-center justify-start shrink-0 mr-2">
            <Image 
              src="/assets/images/logos/logo.avif" 
              alt="Admission Hands Logo" 
              width={220}
              height={55}
              className="object-contain w-[160px] h-[40px] sm:w-[180px] sm:h-[45px] md:w-[200px] md:h-[50px] transition-all dark:brightness-110 dark:hue-rotate-15"
              priority
              unoptimized
            />
          </Link>

          {/* Center: Centered Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 mx-auto">
            {navLinks.map((link) => {
              const isActive = pathname === link.url;
              const hasDropdown = link.children.length > 0;
              return (
                <div key={link.id} className="relative group">
                  <Link
                    href={link.url}
                    target={link.newTab ? '_blank' : undefined}
                    rel={link.newTab ? 'noopener noreferrer' : undefined}
                    className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-xs xl:text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      isActive
                        ? 'bg-primary-soft text-primary-strong dark:text-primary'
                        : 'text-muted-foreground hover:text-primary hover:bg-primary-soft/60'
                    }`}
                  >
                    {link.label}
                    {hasDropdown && <ChevronDown className="w-3.5 h-3.5" />}
                  </Link>
                  {hasDropdown && (
                    <div className="absolute top-full left-0 pt-2 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-200 z-50">
                      <div className="rounded-xl border border-border bg-card p-1.5 shadow-lift min-w-[230px]">
                        {link.children.map((sub) => (
                          <Link
                            key={sub.id}
                            href={sub.url}
                            target={sub.newTab ? '_blank' : undefined}
                            rel={sub.newTab ? 'noopener noreferrer' : undefined}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-primary-soft hover:text-primary-strong dark:hover:text-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {sub.label}
                            <ChevronRight className="w-3 h-3 opacity-40" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Extreme Right: WhatsApp, Call, Theme Toggle */}
          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => CTA.whatsapp()}
              className="w-11 h-11 rounded-full flex items-center justify-center text-accent hover:bg-accent-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Message us on WhatsApp"
            >
              <WhatsAppIcon size={18} />
            </button>
            {renderThemeToggle()}
            {/* Sign in, or the account. One slot either way, so the header
                does not reflow when somebody signs in. */}
            <Link
              href={accountName ? '/account' : '/login'}
              className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              {accountName || 'Sign in'}
            </Link>
            <button
              onClick={CTA.call}
              className="ml-1 inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2.5 text-xs font-bold text-white shadow-glow transition-all duration-200 hover:shadow-glow-lg hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Phone className="w-3.5 h-3.5" />
              {ctaLabel || 'Talk to a counsellor'}
            </button>
          </div>

          {/* Mobile menu trigger + theme toggle row */}
          <div className="flex lg:hidden items-center gap-1 shrink-0">
            {renderThemeToggle()}
            <button
              className="p-2 -mr-2 text-slate-600 dark:text-slate-400 min-w-[44px] min-h-[44px] flex items-center justify-center transition-transform active:scale-90"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
              style={{ zIndex: 110 }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 right-0 bottom-0 w-[78%] max-w-[320px] bg-white dark:bg-slate-950 shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800"
              style={{ zIndex: 120 }}
            >
              <div className="p-4 pt-16 flex-1 overflow-y-auto">
                <nav className="flex flex-col gap-0.5" role="navigation">
                  {navLinks.map((link) => {
                    const hasDropdown = link.children.length > 0;
                    const isActive =
                      pathname === link.url ||
                      (hasDropdown && link.url !== '/' && pathname?.startsWith(link.url));
                    const isOpen = expanded === link.id;

                    if (hasDropdown) {
                      return (
                        <div key={link.id}>
                          <div className="flex items-center gap-0">
                            <Link
                              href={link.url}
                              target={link.newTab ? '_blank' : undefined}
                              rel={link.newTab ? 'noopener noreferrer' : undefined}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex-1 flex items-center gap-2 p-2 rounded-xl transition-all active:scale-[0.97] ${
                                isActive ? 'bg-cyan-50/80 dark:bg-cyan-950/20 text-cyan-750 dark:text-cyan-400' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                              }`}
                            >
                              <div className={`w-1 h-3 rounded-full bg-emerald-500 ${isActive ? 'opacity-100' : 'opacity-20'}`} />
                              <span className="text-[12px] font-bold tracking-tight">{link.label}</span>
                            </Link>
                            <button
                              onClick={() => setExpanded(isOpen ? null : link.id)}
                              className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                              aria-expanded={isOpen}
                              aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${link.label} submenu`}
                            >
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="pl-4 py-0.5 flex flex-col gap-0.5">
                                  {link.children.map((sub) => {
                                    const subActive = pathname === sub.url;
                                    return (
                                      <Link
                                        key={sub.id}
                                        href={sub.url}
                                        target={sub.newTab ? '_blank' : undefined}
                                        rel={sub.newTab ? 'noopener noreferrer' : undefined}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center justify-between p-2 pl-3 rounded-lg text-[11px] font-bold transition-all active:scale-[0.97] ${
                                          subActive ? 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-800'
                                        }`}
                                      >
                                        <span>{sub.label}</span>
                                        <ChevronRight className="w-3 h-3 opacity-30" />
                                      </Link>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }
                    return (
                      <Link
                        key={link.id}
                        href={link.url}
                        target={link.newTab ? '_blank' : undefined}
                        rel={link.newTab ? 'noopener noreferrer' : undefined}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-2 p-2 rounded-xl transition-all active:scale-[0.97] ${
                          isActive ? 'bg-cyan-50/80 dark:bg-cyan-950/20 text-cyan-750 dark:text-cyan-400' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                        }`}
                      >
                        <div className={`w-1 h-3 rounded-full bg-cyan-500 ${isActive ? 'opacity-100' : 'opacity-20'}`} />
                        <span className="text-[12px] font-bold tracking-tight">{link.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                <div className="flex items-center justify-center">
                  <Image 
                    src="/assets/images/logos/logo.avif" 
                    alt="Admission Hands Logo" 
                    width={130}
                    height={32}
                    className="object-contain w-[130px] h-[32px]"
                    unoptimized
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
