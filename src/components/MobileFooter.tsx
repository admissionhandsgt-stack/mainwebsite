"use client";

import React, { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';
import { useContactInfo } from '@/hooks/useContactInfo';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

/**
 * The phone's floating call and WhatsApp buttons. They are drawn with the page (no pop-in at hydration), step aside
 * after 4 s without a scroll, tap or key once the visitor has started using the page, and come back on the next one.
 * Before the first interaction they stay put (2026-11-17: they used to pop in at hydration and vanish 4 s later on a
 * page nobody had touched yet — two screen changes PageSpeed counted against Speed Index). CSS transitions, not
 * framer-motion, so this shell-wide component no longer pulls the animation library onto every page.
 */
const MobileFooter = () => {
  const { contactInfo } = useContactInfo();
  const phoneNumber = contactInfo?.phone_number || '+919873133846';

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);

  // 1. Hamburger menu open listener
  useEffect(() => {
    setIsMenuOpen(document.body.classList.contains('no-scroll'));
    const handleMenuToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsMenuOpen(!!customEvent.detail?.open);
    };
    window.addEventListener('mobileMenuToggle', handleMenuToggle);
    return () => window.removeEventListener('mobileMenuToggle', handleMenuToggle);
  }, []);

  // 2. Inactivity timer (4 seconds), started by the first interaction.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const resetTimer = () => {
      setVisible(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setVisible(false), 4000);
    };
    const events = ['scroll', 'click', 'touchstart', 'touchmove', 'mousemove', 'keydown'];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, []);

  const handleWhatsAppClick = () => {
    window.open(`https://wa.me/${phoneNumber.replace(/[+\s-]/g, '')}?text=${encodeURIComponent("Hi, I'm interested in NEET counselling")}`, '_blank');
  };

  const handleCallClick = () => {
    window.location.href = `tel:${phoneNumber.replace(/[+\s-]/g, '')}`;
  };

  const shown = visible && !isMenuOpen;
  // Hidden buttons stay mounted (so nothing re-renders the tree) but are faded, shrunk and taken out of the tab order.
  const state = shown ? 'scale-100 opacity-100' : 'pointer-events-none scale-0 opacity-0';
  const base =
    'fixed z-[100] flex h-11 w-11 items-center justify-center rounded-full text-white transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none active:scale-90';

  return (
    <div className="md:hidden contents">
      {/* Floating Call Icon — Bottom Left */}
      <button
        type="button"
        onClick={handleCallClick}
        tabIndex={shown ? 0 : -1}
        aria-hidden={!shown}
        className={`${base} ${state} left-5 bg-slate-900 shadow-[0_6px_20px_rgba(0,0,0,0.3)]`}
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        aria-label="Call Expert"
      >
        <Phone className="h-5 w-5" />
      </button>

      {/* Floating WhatsApp Icon — Bottom Right */}
      <button
        type="button"
        onClick={handleWhatsAppClick}
        tabIndex={shown ? 0 : -1}
        aria-hidden={!shown}
        className={`${base} ${state} right-5 bg-[#25D366] shadow-[0_6px_20px_rgba(37,211,102,0.4)]`}
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        aria-label="WhatsApp us"
      >
        <WhatsAppIcon size={22} />
      </button>

      {/* Safe Area Spacer */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </div>
  );
};

export default MobileFooter;
