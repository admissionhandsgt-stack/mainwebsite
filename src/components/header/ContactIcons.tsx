"use client";

import React, { useEffect, useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useContactInfo } from '@/hooks/useContactInfo';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

interface ContactIconsProps {
  compact?: boolean;
}

const ContactIcons: React.FC<ContactIconsProps> = ({ compact = false }) => {
  const { contactInfo: fetchedInfo } = useContactInfo();
  const contactInfo = fetchedInfo || {
    email: 'info@admissionhands.com',
    phone_number: '+919310301949',
    whatsapp_number: '+919310301949'
  };

  const baseIconSize = compact ? "w-5 h-5" : "w-4 h-4";
  const whatsappIconSize = compact ? 24 : 20;

  const handleWhatsappClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.success(`Connect on WhatsApp at ${contactInfo.whatsapp_number}`);
    
    // Open WhatsApp in a new tab
    window.open(`https://wa.me/${contactInfo.whatsapp_number.replace(/[+\s-]/g, '')}`, '_blank');
  };

  const handleCallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.success(`Calling ${contactInfo.phone_number}`);
    
    // Open call in a new tab
    window.open(`tel:${contactInfo.phone_number.replace(/[+\s-]/g, '')}`, '_blank');
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <a 
        href={`mailto:${contactInfo.email}`} 
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors text-medical-600"
        aria-label="Email us"
      >
        <Mail className={baseIconSize} />
      </a>
      
      <a 
        href="#"
        onClick={handleWhatsappClick}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors text-emerald-500"
        aria-label="Contact on WhatsApp"
      >
        <WhatsAppIcon size={whatsappIconSize} />
      </a>
      
      <a 
        href="#"
        onClick={handleCallClick}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors text-blue-600"
        aria-label="Call us"
      >
        <Phone className={baseIconSize} />
      </a>
    </div>
  );
};

export default ContactIcons;
