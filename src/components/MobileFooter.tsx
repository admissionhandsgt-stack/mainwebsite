"use client";

import React, { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';
import { useContactInfo } from '@/hooks/useContactInfo';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { motion, AnimatePresence } from 'framer-motion';

const MobileFooter = () => {
  const { contactInfo } = useContactInfo();
  const phoneNumber = contactInfo?.phone_number || '+919873133846';

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);

  // 1. Hamburger menu open listener
  useEffect(() => {
    // Check initial state
    setIsMenuOpen(document.body.classList.contains('no-scroll'));

    const handleMenuToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsMenuOpen(!!customEvent.detail?.open);
    };

    window.addEventListener('mobileMenuToggle', handleMenuToggle);
    return () => {
      window.removeEventListener('mobileMenuToggle', handleMenuToggle);
    };
  }, []);

  // 2. Inactivity/hold timer (4 seconds)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      setVisible(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setVisible(false);
      }, 4000);
    };

    // User interactions: scroll, click, touches, keydown, cursor movement
    const events = ['scroll', 'click', 'touchstart', 'touchmove', 'mousemove', 'keydown'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  const handleWhatsAppClick = () => {
    window.open(`https://wa.me/${phoneNumber.replace(/[+\s-]/g, '')}?text=${encodeURIComponent("Hi, I'm interested in MD/MS counselling")}`, '_blank');
  };

  const handleCallClick = () => {
    window.location.href = `tel:${phoneNumber.replace(/[+\s-]/g, '')}`;
  };
  
  return (
    <div className="md:hidden contents">
      <AnimatePresence>
        {visible && !isMenuOpen && (
          <>
            {/* Floating Call Icon — Bottom Left (Compact by 20% & pushed closer to bottom) */}
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 200 }}
              onClick={handleCallClick}
              className="fixed left-5 z-[100] w-11 h-11 bg-slate-900 text-white rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.3)] flex items-center justify-center active:scale-90 transition-transform"
              style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
              aria-label="Call Expert"
            >
              <Phone className="h-5 w-5" />
            </motion.button>

            {/* Floating WhatsApp Icon — Bottom Right (Compact by 20% & pushed closer to bottom) */}
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 200 }}
              onClick={handleWhatsAppClick}
              className="fixed right-5 z-[100] w-11 h-11 bg-[#25D366] text-white rounded-full shadow-[0_6px_20px_rgba(37,211,102,0.4)] flex items-center justify-center active:scale-90 transition-transform"
              style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
              aria-label="WhatsApp us"
            >
              <WhatsAppIcon size={22} />
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* Safe Area Spacer */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </div>
  );
};

export default MobileFooter;
