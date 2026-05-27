"use client";

import { Phone } from 'lucide-react';
import { useContactInfo } from '@/hooks/useContactInfo';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { motion } from 'framer-motion';

const MobileFooter = () => {
  const { contactInfo } = useContactInfo();
  const phoneNumber = contactInfo?.phone_number || '+919873133846';

  const handleWhatsAppClick = () => {
    window.open(`https://wa.me/${phoneNumber.replace(/[+\s-]/g, '')}?text=${encodeURIComponent("Hi, I'm interested in MD/MS counselling")}`, '_blank');
  };

  const handleCallClick = () => {
    window.location.href = `tel:${phoneNumber.replace(/[+\s-]/g, '')}`;
  };
  
  return (
    <div className="md:hidden contents">
      {/* Floating Call Icon — Bottom Left */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: 'spring', damping: 18, stiffness: 200 }}
        onClick={handleCallClick}
        className="fixed left-5 z-[100] w-14 h-14 bg-slate-900 text-white rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.3)] flex items-center justify-center active:scale-90 transition-transform"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        aria-label="Call Expert"
      >
        <Phone className="h-6 w-6" />
      </motion.button>

      {/* Floating WhatsApp Icon — Bottom Right */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.4, type: 'spring', damping: 18, stiffness: 200 }}
        onClick={handleWhatsAppClick}
        className="fixed right-5 z-[100] w-14 h-14 bg-[#25D366] text-white rounded-full shadow-[0_8px_24px_rgba(37,211,102,0.4)] flex items-center justify-center active:scale-90 transition-transform"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        aria-label="WhatsApp us"
      >
        <WhatsAppIcon size={28} />
      </motion.button>

      {/* Safe Area Spacer */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </div>
  );
};

export default MobileFooter;
