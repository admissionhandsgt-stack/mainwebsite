"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, ChevronDown, GraduationCap, Shield, ChevronRight } from 'lucide-react';
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

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-[40] bg-white border-b border-slate-200 shadow-sm transition-all">
      <div className="container-custom h-[72px] flex items-center justify-between">
        <Link href="/" className="inline-block relative w-[200px] h-[50px] md:w-[240px] md:h-[60px]">
          <Image 
            src="/assets/images/logos/logo-4k.webp" 
            alt="Admission Hands Logo" 
            fill
            className="object-contain"
            priority
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1 xl:gap-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <div key={link.name} className="relative group">
                <Link
                  href={link.href}
                  className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-semibold transition-all ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                  {link.hasDropdown && <ChevronDown className="w-4 h-4" />}
                </Link>
                {link.hasDropdown && (
                  <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 min-w-[220px]">
                      {mbbsSubLinks.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all"
                        >
                          {sub.name}
                          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => CTA.whatsapp()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors"
            aria-label="WhatsApp Us"
          >
            <WhatsAppIcon size={20} />
          </button>
          <button
            onClick={CTA.call}
            className="w-10 h-10 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
            aria-label="Call Us"
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>

        <button
          className="lg:hidden p-3 -mr-2 text-slate-600 relative z-[70] min-w-[44px] min-h-[44px] flex items-center justify-center transition-transform active:scale-90"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              style={{ zIndex: 65 }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 right-0 bottom-0 w-[78%] max-w-[340px] bg-white shadow-2xl flex flex-col"
              style={{ zIndex: 68 }}
            >
              <div className="p-4 pt-20 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-0.5">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href || (link.hasDropdown && pathname?.startsWith('/mbbs-india'));
                    if (link.hasDropdown) {
                      return (
                        <div key={link.name}>
                          <div className="flex items-center gap-0">
                            <Link
                              href={link.href}
                              className={`flex-1 flex items-center gap-2.5 p-2.5 rounded-xl transition-all active:scale-[0.97] ${
                                isActive ? 'bg-blue-50/80 text-blue-700' : 'text-slate-800 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`w-1 h-4 rounded-full bg-emerald-500 ${isActive ? 'opacity-100' : 'opacity-20'}`} />
                              <span className="text-[13px] font-black tracking-tight">{link.name}</span>
                            </Link>
                            <button
                              onClick={() => setMbbsExpanded(!mbbsExpanded)}
                              className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                              aria-label="Expand MBBS submenu"
                            >
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${mbbsExpanded ? 'rotate-180' : ''}`} />
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
                                <div className="pl-5 py-0.5 flex flex-col gap-0.5">
                                  {mbbsSubLinks.map((sub) => {
                                    const subActive = pathname === sub.href;
                                    return (
                                      <Link
                                        key={sub.href}
                                        href={sub.href}
                                        className={`flex items-center justify-between p-2 pl-3.5 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ${
                                          subActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
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
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all active:scale-[0.97] ${
                          isActive ? 'bg-blue-50/80 text-blue-700' : 'text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-1 h-4 rounded-full bg-blue-500 ${isActive ? 'opacity-100' : 'opacity-20'}`} />
                        <span className="text-[13px] font-black tracking-tight">{link.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={CTA.call}
                    className="flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Now
                  </button>
                  <button
                    onClick={() => CTA.whatsapp()}
                    className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                  >
                    <WhatsAppIcon size={14} /> WhatsApp
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <div className="relative w-[150px] h-[40px]">
                    <Image 
                      src="/assets/images/logos/logo-4k.webp" 
                      alt="Admission Hands Logo" 
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
