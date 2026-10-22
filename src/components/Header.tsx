"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import Link from "@/components/ui/Link";
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, ChevronDown, ChevronRight, Sun, Moon, UserRound, ArrowRight, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCTA } from '@/hooks/useCTA';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import TelegramLink, { fillRound, useTelegram } from '@/components/engage/TelegramLink';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

import type { NavItem } from '@/lib/content';

/**
 * What renders if the nav_items table is empty or unreachable.
 *
 * Kept in step with the real menu on purpose: it used to still list
 * `/md-ms-india/cutoffs`, a route that has redirected for weeks, so the one
 * time this fallback mattered it would have shipped a dead link.
 *
 * Since 2026-10-21 the course menus are grouped (see "Mega menus" below); the
 * fallback stays flat — it only has to get somebody somewhere.
 */
const FALLBACK_NAV: NavItem[] = [
  { id: -2, label: 'NEET College Predictor', url: '/neet-college-predictor', newTab: false, children: [] },
  {
    id: -3, label: 'MBBS', url: '/mbbs-india', newTab: false,
    children: [
      { id: -31, label: 'MBBS Colleges', url: '/mbbs-india/colleges', newTab: false, children: [] },
      { id: -32, label: 'Deemed Universities', url: '/mbbs-india/deemed-universities', newTab: false, children: [] },
      { id: -33, label: 'NEET UG Cutoff', url: '/neet-ug-cutoff', newTab: false, children: [] },
      { id: -34, label: 'NEET UG Process', url: '/neet-ug-process', newTab: false, children: [] },
    ],
  },
  {
    id: -4, label: 'MD/MS', url: '/md-ms-india', newTab: false,
    children: [
      { id: -41, label: 'PG Colleges', url: '/md-ms-india/colleges', newTab: false, children: [] },
      { id: -42, label: 'NEET PG Cutoff', url: '/neet-pg-cutoff', newTab: false, children: [] },
      { id: -43, label: 'NEET PG Process', url: '/neet-pg-process', newTab: false, children: [] },
    ],
  },
  {
    id: -9, label: 'Other Courses', url: '#', newTab: false,
    children: [
      { id: -91, label: 'BDS Colleges', url: '/bds-india', newTab: false, children: [] },
      { id: -92, label: 'NEET MDS Cutoff', url: '/neet-mds-cutoff', newTab: false, children: [] },
      { id: -93, label: 'BAMS & AYUSH Colleges', url: '/ayush-colleges', newTab: false, children: [] },
      { id: -94, label: 'NEET SS (DM/MCh) Cutoff', url: '/neet-ss-cutoff', newTab: false, children: [] },
    ],
  },
  {
    id: -5, label: 'NRI', url: '/nri-quota', newTab: false,
    children: [
      { id: -51, label: 'NRI Quota Colleges', url: '/nri-quota/colleges', newTab: false, children: [] },
      { id: -52, label: 'Documents Required', url: '/nri-quota/documents', newTab: false, children: [] },
    ],
  },
  {
    id: -7, label: 'Know Us', url: '/know-us', newTab: false,
    children: [
      { id: -71, label: 'Services', url: '/services', newTab: false, children: [] },
      { id: -72, label: 'Videos', url: '/videos', newTab: false, children: [] },
    ],
  },
];

/** A menu with no page of its own — its url is "#" — only opens its list. */
const isMenuOnly = (link: NavItem) => !link.url || link.url === '#';
/**
 * Mega menus (2026-10-21, owner: "MD/MS ki drop down kitni badi hogyi hai"). An item whose children
 * have children of their own is a grouped menu: each child is a titled column (url "#"), its children
 * the links, each with a one-line description. Plain children stay a simple dropdown. All of it is
 * Admin → Navigation; nothing here names a page.
 */
const isGrouped = (link: NavItem) => link.children.some((c) => c.children.length > 0);
/** The item, or anything under it, is the page being shown. */
const holds = (link: NavItem, path: string | null): boolean =>
  !!path && ((!isMenuOnly(link) && path === link.url) || link.children.some((c) => holds(c, path)));

const linkProps = (l: NavItem) => (l.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {});

export default function Header({
  nav,
  ctaLabel,
  showThemeToggle = true,
  accountName,
  onSearch,
}: {
  nav?: NavItem[];
  ctaLabel?: string;
  showThemeToggle?: boolean;
  /** First name when signed in, null when not. Decides Sign in vs Account. */
  accountName?: string | null;
  /** Opens the site search, when the shell provides one. */
  onSearch?: () => void;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Keyed by item id: one shared flag meant opening MBBS also opened PG.
  const [expanded, setExpanded] = useState<number | null>(null);
  const pathname = usePathname();
  const CTA = useCTA();
  const telegram = useTelegram();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [scrolled, setScrolled] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);
  useFocusTrap(drawer, isMobileMenuOpen);

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

  // A desktop menu opens on hover and on focus, so after a click it would stay open over the new
  // page: the clicked link keeps focus and the pointer is still on it (owner, 2026-10-21). A click
  // shuts that item's menu until the pointer leaves the item or a key is pressed in the bar, and a
  // page change takes focus out of the bar.
  const [shut, setShut] = useState<number | null>(null);
  const picked = (id: number) => () => {
    setShut(id);
    const el = document.activeElement as HTMLElement | null;
    if (el?.closest('[data-desktop-nav]')) el.blur();
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setExpanded(null);
    const el = document.activeElement as HTMLElement | null;
    if (el?.closest('[data-desktop-nav]')) el.blur();
  }, [pathname]);

  // Escape closes the drawer, and takes focus out of an open desktop menu (the menus open on
  // hover and on focus, so leaving focus is what closes them for a keyboard user).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsMobileMenuOpen(false);
      const el = document.activeElement as HTMLElement | null;
      if (el?.closest('[data-desktop-nav]')) el.blur();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>
    );
  };

  const searchButton = (extra = '') =>
    onSearch ? (
      <button
        type="button"
        onClick={onSearch}
        aria-label="Search colleges, branches and pages"
        title="Search"
        className={`w-11 h-11 rounded-full flex items-center justify-center text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors shrink-0 ${extra}`}
      >
        <Search className="w-[18px] h-[18px]" aria-hidden="true" />
      </button>
    ) : null;

  /* ---------------------------------------------------------------- desktop panels */

  const megaPanel = (link: NavItem) => {
    const groups = link.children.filter((g) => g.children.length > 0);
    const loose = link.children.filter((g) => g.children.length === 0);
    const cols = Math.min(groups.length, 3);
    return (
      <div
        className="rounded-2xl border border-border bg-card shadow-lift overflow-hidden"
        style={{ width: `min(${cols >= 3 ? 880 : 600}px, calc(100vw - 3rem))` }}
      >
        <div className="grid gap-x-6 gap-y-5 p-5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {groups.map((g) => (
            <div key={g.id} className="min-w-0">
              <p className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{g.label}</p>
              <ul className="mt-2 space-y-0.5">
                {g.children.map((l) => {
                  const here = pathname === l.url;
                  return (
                    <li key={l.id}>
                      <Link
                        href={l.url}
                        {...linkProps(l)}
                        onClick={picked(link.id)}
                        aria-current={here ? 'page' : undefined}
                        className={`block rounded-xl px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          here ? 'bg-primary-soft' : 'hover:bg-primary-soft/70'
                        }`}
                      >
                        <span className={`block text-[14px] font-semibold leading-snug ${here ? 'text-primary-strong dark:text-primary' : 'text-foreground'}`}>
                          {l.label}
                        </span>
                        {l.description && (
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{l.description}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        {(loose.length > 0 || !isMenuOnly(link)) && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-1 px-6 py-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {!isMenuOnly(link) && (
                <Link
                  href={link.url}
                  onClick={picked(link.id)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-strong hover:underline dark:text-primary"
                >
                  {link.label} overview <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
              {loose.map((l) => (
                <Link key={l.id} href={l.url} {...linkProps(l)} onClick={picked(link.id)} className="text-[13px] font-semibold text-muted-foreground hover:text-primary">
                  {l.label}
                </Link>
              ))}
            </div>
            <Link
              href="/neet-college-predictor"
              onClick={picked(link.id)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-1.5 text-[12.5px] font-bold text-primary-strong hover:bg-primary-soft/70 dark:text-primary"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" /> Check your chances with your rank
            </Link>
          </div>
        )}
      </div>
    );
  };

  const simplePanel = (link: NavItem) => (
    <div className="rounded-xl border border-border bg-card p-1.5 shadow-lift min-w-[250px] max-w-[320px]">
      {link.children.map((sub) => (
        <Link
          key={sub.id}
          href={sub.url}
          {...linkProps(sub)}
          onClick={picked(link.id)}
          aria-current={pathname === sub.url ? 'page' : undefined}
          className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-primary-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group/item"
        >
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold text-foreground group-hover/item:text-primary-strong dark:group-hover/item:text-primary">{sub.label}</span>
            {sub.description && <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{sub.description}</span>}
          </span>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-40" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <header
        data-site-header
        className={`fixed top-0 left-0 right-0 w-full z-[100] transition-all duration-300 ${
          scrolled
            ? 'bg-background/85 backdrop-blur-xl border-b border-border/70 shadow-sm'
            : 'bg-background/60 backdrop-blur-md border-b border-transparent'
        }`}
      >
        <div className="w-full max-w-[var(--page-max)] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
          {/* Extreme Left: Logo */}
          <Link href="/" className="flex min-h-[44px] items-center justify-start shrink-0 mr-2" aria-label="Admission Hands — home">
            <Image
              src="/assets/images/logos/logo.avif"
              alt="Admission Hands Logo"
              width={220}
              height={55}
              className="object-contain w-[160px] h-[40px] sm:w-[180px] sm:h-[45px] md:w-[200px] md:h-[50px] xl:w-[180px] xl:h-[45px] min-[1800px]:w-[200px] min-[1800px]:h-[50px] transition-all dark:brightness-110 dark:hue-rotate-15"
              priority
              unoptimized
            />
          </Link>

          {/*
            Center: the navigation, from 1280px; compact until 1800px.

            The row needs ~1,400px at full size and the container gives it 1,216px at 1280–1535px.
            Everything is shrink-0 and nowrap, and body clips horizontal overflow, so an over-long row
            does not wrap — its right-hand button silently disappears (it did, until 2026-10-06).
            Six items leave room at 1280. Measure before adding a top-level item:
            node scripts/tmp/header_budget.mjs <base> "<label>" --real
          */}
          <nav data-desktop-nav aria-label="Main" onKeyDown={() => setShut(null)} className="mx-auto hidden items-center gap-0.5 xl:flex min-[1800px]:gap-1.5">
            {navLinks.map((link) => {
              const hasDropdown = link.children.length > 0;
              const menuOnly = hasDropdown && isMenuOnly(link);
              const grouped = hasDropdown && isGrouped(link);
              const isActive = holds(link, pathname);
              const itemClass = `flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-[1800px]:px-3.5 min-[1800px]:text-sm ${
                isActive
                  ? 'bg-primary-soft text-primary-strong dark:text-primary'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary-soft/60'
              }`;
              return (
                <div key={link.id} className="relative group" onMouseLeave={() => setShut((v) => (v === link.id ? null : v))}>
                  {/* A menu with no page of its own ("Other Courses", url "#") is a
                      button: focusing it opens the list, as hovering does. */}
                  {menuOnly ? (
                    <button type="button" aria-haspopup="true" className={itemClass}>
                      {link.label}
                      <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden="true" />
                    </button>
                  ) : (
                    <Link href={link.url} {...linkProps(link)} onClick={hasDropdown ? picked(link.id) : undefined} aria-haspopup={hasDropdown ? 'true' : undefined} className={itemClass}>
                      {link.label}
                      {hasDropdown && (
                        <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden="true" />
                      )}
                    </Link>
                  )}
                  {hasDropdown && (
                    <div
                      // Opens at once and fades out (150ms): a menu used many times a visit should not
                      // make anybody wait for it to arrive.
                      className={`absolute top-full z-50 pt-3 opacity-0 invisible transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-hover:duration-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:duration-0 ${
                        grouped ? 'left-1/2 -translate-x-1/2' : 'left-0'
                      } ${shut === link.id ? '!invisible !opacity-0' : ''}`}
                    >
                      {grouped ? megaPanel(link) : simplePanel(link)}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Extreme Right: search, WhatsApp, theme, account, call */}
          <div className="hidden xl:flex items-center gap-1 shrink-0">
            {searchButton()}
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
              // The student's first name is on this button: AutoLoom must not record its text.
              data-aa-mask
              aria-label={accountName ? `Your account (${accountName})` : 'Sign in'}
              title={accountName || 'Sign in'}
              className="ml-1 inline-flex h-11 w-11 items-center justify-center gap-1.5 rounded-full border border-border text-xs font-bold text-foreground transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-[1800px]:h-auto min-[1800px]:w-auto min-[1800px]:px-3 min-[1800px]:py-2"
            >
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden min-[1800px]:inline">{accountName || 'Sign in'}</span>
            </Link>
            <button
              onClick={CTA.call}
              className="ml-1 inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2.5 text-xs font-bold text-white shadow-glow transition-all duration-200 hover:shadow-glow-lg hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Phone className="w-3.5 h-3.5" />
              {ctaLabel || 'Talk to a counsellor'}
            </button>
          </div>

          {/* Phone and tablet: search, theme, menu */}
          <div className="flex xl:hidden items-center gap-0.5 shrink-0">
            {searchButton()}
            {renderThemeToggle()}
            <button
              className="p-2 -mr-2 text-slate-600 dark:text-slate-400 min-w-[44px] min-h-[44px] flex items-center justify-center transition-transform active:scale-90"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-drawer"
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
              className="xl:hidden fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
              style={{ zIndex: 110 }}
            />
            <motion.div
              ref={drawer}
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="xl:hidden fixed top-0 right-0 bottom-0 w-[86%] max-w-[360px] bg-background shadow-2xl flex flex-col border-l border-border overscroll-contain"
              style={{ zIndex: 120 }}
            >
              <div className="flex items-center justify-between px-4 h-[72px] border-b border-border shrink-0">
                <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Menu</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="px-3 py-3 flex-1 overflow-y-auto overscroll-contain">
                <nav className="flex flex-col gap-0.5" aria-label="Main">
                  {navLinks.map((link) => {
                    const hasDropdown = link.children.length > 0;
                    const menuOnly = hasDropdown && isMenuOnly(link);
                    const isActive = holds(link, pathname);
                    const isOpen = expanded === link.id;
                    const rowClass = `flex-1 flex items-center min-h-[48px] px-3 rounded-xl text-left text-[15px] font-semibold transition-colors ${
                      isActive ? 'bg-primary-soft text-primary-strong dark:text-primary' : 'text-foreground hover:bg-surface-2'
                    }`;

                    if (!hasDropdown) {
                      return (
                        <Link
                          key={link.id}
                          href={link.url}
                          {...linkProps(link)}
                          onClick={() => setIsMobileMenuOpen(false)}
                          aria-current={pathname === link.url ? 'page' : undefined}
                          className={rowClass}
                        >
                          {link.label}
                        </Link>
                      );
                    }

                    const subLink = (sub: NavItem) => {
                      const here = pathname === sub.url;
                      return (
                        <Link
                          key={sub.id}
                          href={sub.url}
                          {...linkProps(sub)}
                          onClick={() => setIsMobileMenuOpen(false)}
                          aria-current={here ? 'page' : undefined}
                          className={`flex items-center justify-between min-h-[44px] pl-4 pr-3 rounded-lg text-[14px] font-medium transition-colors ${
                            here ? 'bg-primary-soft text-primary-strong dark:text-primary' : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                          }`}
                        >
                          <span>{sub.label}</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-40" aria-hidden="true" />
                        </Link>
                      );
                    };

                    return (
                      <div key={link.id}>
                        <div className="flex items-center gap-1">
                          {/* No page of its own: the label opens the list too. */}
                          {menuOnly ? (
                            <button
                              type="button"
                              onClick={() => setExpanded(isOpen ? null : link.id)}
                              aria-expanded={isOpen}
                              className={rowClass}
                            >
                              {link.label}
                            </button>
                          ) : (
                            <Link
                              href={link.url}
                              {...linkProps(link)}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={rowClass}
                            >
                              {link.label}
                            </Link>
                          )}
                          <button
                            onClick={() => setExpanded(isOpen ? null : link.id)}
                            className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-surface-2 transition-colors flex items-center justify-center"
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${link.label}`}
                          >
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
                              <div className="pb-2 pt-0.5 flex flex-col gap-0.5">
                                {isGrouped(link)
                                  ? link.children.map((g) =>
                                      g.children.length ? (
                                        <div key={g.id} className="pt-2">
                                          <p className="px-4 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{g.label}</p>
                                          {g.children.map(subLink)}
                                        </div>
                                      ) : (
                                        subLink(g)
                                      ),
                                    )
                                  : link.children.map(subLink)}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </nav>
              </div>

              {/* What a visitor on a phone most often wants: a person. */}
              <div className="p-4 border-t border-border bg-surface-1 grid gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    CTA.call();
                  }}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 text-[15px] font-bold text-white shadow-glow"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" /> {ctaLabel || 'Talk to a counsellor'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      CTA.whatsapp();
                    }}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border bg-card text-[14px] font-semibold text-foreground"
                  >
                    <WhatsAppIcon size={16} /> WhatsApp
                  </button>
                  <Link
                    href={accountName ? '/account' : '/login'}
                    data-aa-mask
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border bg-card text-[14px] font-semibold text-foreground"
                  >
                    <UserRound className="h-4 w-4" aria-hidden="true" /> {accountName ? 'Account' : 'Sign in'}
                  </Link>
                </div>
                {/* The channel, under the people (2026-10-23): named for the next NEET PG result while one is due. */}
                <TelegramLink
                  placement="drawer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  iconClassName="text-[#229ED9]"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border bg-card text-[14px] font-semibold text-foreground"
                >
                  {telegram.round ? `${fillRound(telegram.roundCopy.bar, telegram.round)} on Telegram` : 'Counselling updates on Telegram'}
                </TelegramLink>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
