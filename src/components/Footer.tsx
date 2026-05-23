import React from 'react';
import { Mail, Phone, MapPin, ArrowRight, Instagram, Facebook, Youtube, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import MobileFooter from './MobileFooter';
import { CONTACT_INFO } from '@/lib/constants';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const phoneNumber = CONTACT_INFO.phone;
  
  return (
    <>
      <footer className="relative bg-[#060b16] text-white pt-6 pb-2 md:pt-10 md:pb-6 overflow-hidden">
        {/* Subtle mesh gradient background */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400 blur-[100px]" />
        </div>

        <div className="container-custom relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex flex-col">
                <Link href="/" className="inline-block relative w-[200px] h-[50px] md:w-[240px] md:h-[60px]">
                  <Image 
                    src="/assets/images/logos/logo-4k.webp" 
                    alt="Admission Hands Logo" 
                    fill
                    className="object-contain"
                  />
                </Link>
              </div>
              
              <p className="text-gray-400 text-[11px] md:text-xs font-medium leading-relaxed max-w-sm">
                India&apos;s most trusted partner for MBBS & PG medical admissions. Expert guidance and transparent processes for your career.
              </p>
              
              <div className="flex space-x-2 md:space-x-3">
                {[
                  { icon: Facebook, href: 'https://facebook.com/admissionhands', color: 'hover:bg-blue-600' },
                  { icon: Instagram, href: 'https://www.instagram.com/admissionhandss?igsh=cDEyd2dsdXBpeW5v', color: 'hover:bg-pink-600' },
                  { icon: Youtube, href: 'https://youtube.com/@admissionhands', color: 'hover:bg-red-600' }
                ].map((social, idx) => (
                  <a 
                    key={idx}
                    href={social.href} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("bg-white/5 p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all duration-300 border border-white/10 text-gray-400 hover:text-white", social.color)}
                    aria-label="Social Link"
                  >
                    <social.icon size={14} className="md:w-4 md:h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Mobile Quick Links Row (Only on Mobile) */}
            <div className="lg:hidden flex flex-wrap gap-2 py-2 border-y border-white/5 mt-2">
              {[
                { name: 'MBBS India', href: '/mbbs-india' },
                { name: 'PG/MD', href: '/md-ms-india' },
                { name: 'Services', href: '/services' },
                { name: 'Contact', href: '/contact' }
              ].map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href}
                  className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
            
            {/* Desktop Explore / Mobile Accordion */}
            <div className="lg:col-span-2">
              <div className="hidden lg:block space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Explore</h4>
                <ul className="space-y-2">
                  {['MBBS India', 'MD/MS India', 'Services', 'Know Us', 'Terms'].map((item) => (
                    <li key={item}>
                      <Link 
                        href={item === 'MBBS India' ? '/mbbs-india' : item === 'MD/MS India' ? '/md-ms-india' : `/${item.toLowerCase().replace(' ', '-')}`}
                        className="text-gray-400 hover:text-white text-xs font-bold transition-colors flex items-center group"
                      >
                        <ArrowRight className="h-3 w-3 mr-2 opacity-0 group-hover:opacity-100 transition-all -ml-5 group-hover:ml-0" />
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <details className="lg:hidden group border-b border-white/5 pb-1">
                <summary className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 cursor-pointer list-none py-2 [&::-webkit-details-marker]:hidden">
                  Explore
                  <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pt-1 pb-3 pl-1">
                  <ul className="space-y-2">
                    {['MBBS India', 'MD/MS India', 'Services', 'Know Us'].map((item) => (
                      <li key={item}>
                        <Link 
                          href={item === 'MBBS India' ? '/mbbs-india' : item === 'MD/MS India' ? '/md-ms-india' : `/${item.toLowerCase().replace(' ', '-')}`}
                          className="text-gray-400 text-[11px] font-bold"
                        >
                          {item}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </div>

            {/* Desktop Contact / Mobile Accordion */}
            <div className="lg:col-span-3">
              <div className="hidden lg:block space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Get in Touch</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                      <Phone className="h-4 w-4" />
                    </div>
                    <a href={`tel:${phoneNumber}`} className="text-gray-300 hover:text-white text-xs font-bold transition-colors mt-1.5">
                      {phoneNumber}
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <a href={`mailto:${CONTACT_INFO.email}`} className="text-gray-300 hover:text-white text-xs font-bold transition-colors mt-1.5 break-all">
                      {CONTACT_INFO.email}
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <p className="text-gray-300 text-xs font-bold leading-relaxed mt-1">
                      {CONTACT_INFO.address}
                    </p>
                  </li>
                </ul>
              </div>

              <details className="lg:hidden group border-b border-white/5 pb-1">
                <summary className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 cursor-pointer list-none py-2 [&::-webkit-details-marker]:hidden">
                  Get in Touch
                  <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pt-1 pb-3 pl-1">
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-blue-400" />
                      <a href={`tel:${phoneNumber}`} className="text-gray-400 text-[11px] font-bold">{phoneNumber}</a>
                    </li>
                    <li className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-blue-400" />
                      <a href={`mailto:${CONTACT_INFO.email}`} className="text-gray-400 text-[11px] font-bold">{CONTACT_INFO.email}</a>
                    </li>
                  </ul>
                </div>
              </details>
            </div>

            {/* Newsletter */}
            <div className="lg:col-span-3 space-y-3 lg:space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 hidden lg:block">Updates</h4>
              <p className="text-gray-400 text-[11px] md:text-xs font-medium leading-relaxed mt-2 lg:mt-0">
                Stay updated with the latest admission notifications.
              </p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 text-[11px] md:text-xs w-full focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-gray-600"
                />
                <button className="bg-blue-600 hover:bg-blue-500 p-2 md:p-3 rounded-lg md:rounded-xl transition-all shrink-0 active:scale-95 shadow-lg shadow-blue-900/20 flex items-center justify-center">
                  <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-[9px] md:text-[10px] font-bold text-gray-500">
              &copy; {currentYear} AdmissionHands. All rights reserved.
            </p>
            <div className="flex gap-4 md:gap-6">
              <Link href="/terms" className="text-[9px] md:text-[10px] font-bold text-gray-500 hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="text-[9px] md:text-[10px] font-bold text-gray-500 hover:text-white transition-colors">Terms</Link>
              <Link href="/terms" className="text-[9px] md:text-[10px] font-bold text-gray-500 hover:text-white transition-colors">Disclaimer</Link>
            </div>
          </div>
        </div>
        <div className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" /> {/* Spacer for floating CTA icons */}
      </footer>
      
      <MobileFooter />
    </>
  );
};

export default Footer;
