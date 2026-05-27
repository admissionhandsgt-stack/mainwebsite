"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, ChevronDown, ChevronRight, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCTA } from '@/hooks/useCTA';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const mbbsSubLinks = [
  { name: 'Deemed Universities', href: '/mbbs-india/deemed-universities' },
  { name: 'All Colleges', href: '/mbbs-india/colleges' },
  { name: 'NEET UG Process', href: '/neet-ug-process' },
];

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mbbsExpanded, setMbbsExpanded] = useState(false);
  const pathname = usePathname();
  const CTA = useCTA();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMbbsExpanded(false);
  }, [pathname]);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'MBBS India', href: '/mbbs-india', hasDropdown: true },
    { name: 'PG – MD/MS', href: '/md-ms-india' },
    { name: 'Services', href: '/services' },
    { name: 'Know Us', href: '/know-us' },
    { name: 'Terms', href: '/terms' },
  ];

  const renderThemeToggle = () => {
    if (!mounted) {
      return (
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/40 animate-pulse shrink-0" />
      );
    }
    return (
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-650 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors shrink-0"
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-[40] bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/60 shadow-sm transition-all duration-200">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
        {/* Extreme Left: Logo */}
        <Link href="/" className="flex items-center justify-start shrink-0 mr-2">
          <Image 
            src="/assets/images/logos/logo-4k.webp" 
            alt="Admission Hands Logo" 
            width={220}
            height={55}
            className="object-contain w-[160px] h-[40px] sm:w-[180px] sm:h-[45px] md:w-[200px] md:h-[50px] transition-all dark:brightness-110 dark:hue-rotate-15"
            priority
          />
        </Link>

        {/* Center: Centered Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 mx-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <div key={link.name} className="relative group">
                <Link
                  href={link.href}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs xl:text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                  }`}
                >
                  {link.name}
                  {link.hasDropdown && <ChevronDown className="w-3.5 h-3.5" />}
                </Link>
                {link.hasDropdown && (
                  <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800/80 p-1.5 min-w-[210px]">
                      {mbbsSubLinks.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-350 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-700 dark:hover:text-blue-400 transition-all"
                        >
                          {sub.name}
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
            className="w-10 h-10 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
            aria-label="WhatsApp Us"
          >
            <WhatsAppIcon size={18} />
          </button>
          <button
            onClick={CTA.call}
            className="w-10 h-10 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
            aria-label="Call Us"
          >
            <Phone className="w-4 h-4" />
          </button>
          {renderThemeToggle()}
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
              style={{ zIndex: 65 }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 right-0 bottom-0 w-[78%] max-w-[320px] bg-white dark:bg-slate-950 shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800"
              style={{ zIndex: 68 }}
            >
              <div className="p-4 pt-16 flex-1 overflow-y-auto">
                <nav className="flex flex-col gap-0.5" role="navigation">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href || (link.hasDropdown && pathname?.startsWith('/mbbs-india'));
                    if (link.hasDropdown) {
                      return (
                        <div key={link.name}>
                          <div className="flex items-center gap-0">
                            <Link
                              href={link.href}
                              className={`flex-1 flex items-center gap-2 p-2 rounded-xl transition-all active:scale-[0.97] ${
                                isActive ? 'bg-blue-50/80 dark:bg-blue-950/20 text-blue-750 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                              }`}
                            >
                              <div className={`w-1 h-3 rounded-full bg-emerald-500 ${isActive ? 'opacity-100' : 'opacity-20'}`} />
                              <span className="text-[12px] font-bold tracking-tight">{link.name}</span>
                            </Link>
                            <button
                              onClick={() => setMbbsExpanded(!mbbsExpanded)}
                              className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                              aria-label="Expand MBBS submenu"
                            >
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${mbbsExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                          <AnimatePresence>
                            {mbbsExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="pl-4 py-0.5 flex flex-col gap-0.5">
                                  {mbbsSubLinks.map((sub) => {
                                    const subActive = pathname === sub.href;
                                    return (
                                      <Link
                                        key={sub.href}
                                        href={sub.href}
                                        className={`flex items-center justify-between p-2 pl-3 rounded-lg text-[11px] font-bold transition-all active:scale-[0.97] ${
                                          subActive ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' : 'text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-800'
                                        }`}
                                      >
                                        <span>{sub.name}</span>
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
                        key={link.name}
                        href={link.href}
                        className={`flex items-center gap-2 p-2 rounded-xl transition-all active:scale-[0.97] ${
                          isActive ? 'bg-blue-50/80 dark:bg-blue-950/20 text-blue-750 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                        }`}
                      >
                        <div className={`w-1 h-3 rounded-full bg-blue-500 ${isActive ? 'opacity-100' : 'opacity-20'}`} />
                        <span className="text-[12px] font-bold tracking-tight">{link.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={CTA.call}
                    className="flex items-center justify-center gap-1.5 bg-slate-900 dark:bg-slate-800 text-white py-2 rounded-xl text-[11px] font-bold active:scale-95 transition-transform"
                  >
                    <Phone className="w-3 h-3" /> Call Now
                  </button>
                  <button
                    onClick={() => CTA.whatsapp()}
                    className="flex items-center justify-center gap-1.5 bg-[#25D366] text-white py-2 rounded-xl text-[11px] font-bold active:scale-95 transition-transform"
                  >
                    <WhatsAppIcon size={12} /> WhatsApp
                  </button>
                </div>
                <div className="flex items-center justify-center pt-1.5">
                  <Image 
                    src="/assets/images/logos/logo-4k.webp" 
                    alt="Admission Hands Logo" 
                    width={130}
                    height={32}
                    className="object-contain w-[130px] h-[32px]"
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
