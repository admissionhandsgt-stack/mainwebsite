"use client";
import React from 'react';
import { Mail, Phone, MapPin, ArrowRight, Instagram, Facebook, Youtube, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import MobileFooter from './MobileFooter';
import { CONTACT_INFO } from '@/lib/constants';
import { useContactInfo } from '@/hooks/useContactInfo';
import { useCTA } from '@/hooks/useCTA';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import type { NavItem } from '@/lib/content';
import type { SocialLinks } from './SiteShell';

const FALLBACK_EXPLORE: NavItem[] = [
  { id: -1, label: 'MBBS India', url: '/mbbs-india', newTab: false, children: [] },
  { id: -2, label: 'MD/MS India', url: '/md-ms-india', newTab: false, children: [] },
  { id: -3, label: 'Services', url: '/services', newTab: false, children: [] },
  { id: -4, label: 'Know Us', url: '/know-us', newTab: false, children: [] },
  { id: -5, label: 'Terms', url: '/terms', newTab: false, children: [] },
];

const FALLBACK_QUICK: NavItem[] = FALLBACK_EXPLORE.slice(0, 4);

const DEFAULT_TAGLINE =
  'India\u2019s most trusted partner for MBBS & PG medical admissions. Expert guidance and transparent processes for your career.';

const DEFAULT_SOCIAL: Required<SocialLinks> = {
  facebook: 'https://facebook.com/admissionhands',
  instagram: 'https://www.instagram.com/admissionhandss?igsh=cDEyd2dsdXBpeW5v',
  youtube: 'https://youtube.com/@admissionhands',
};

interface FooterProps {
  explore?: NavItem[];
  quickLinks?: NavItem[];
  tagline?: string;
  social?: SocialLinks;
}

const Footer: React.FC<FooterProps> = ({ explore, quickLinks, tagline, social }) => {
  const currentYear = new Date().getFullYear();
  const { contactInfo } = useContactInfo();
  const cta = useCTA();
  const phoneNumber = contactInfo?.phone_number || CONTACT_INFO.phone;
  const emailAddress = contactInfo?.email || CONTACT_INFO.email;

  const exploreLinks = explore?.length ? explore : FALLBACK_EXPLORE;
  const quick = quickLinks?.length ? quickLinks : FALLBACK_QUICK;

  // An empty setting means "use what shipped"; a blank URL hides that icon.
  const socialLinks = [
    { key: 'facebook', icon: Facebook, href: social?.facebook ?? DEFAULT_SOCIAL.facebook, color: 'hover:bg-cyan-600' },
    { key: 'instagram', icon: Instagram, href: social?.instagram ?? DEFAULT_SOCIAL.instagram, color: 'hover:bg-emerald-600' },
    { key: 'youtube', icon: Youtube, href: social?.youtube ?? DEFAULT_SOCIAL.youtube, color: 'hover:bg-red-600' },
  ].filter((s) => s.href);
  
  return (
    <>
      <footer className="relative bg-[#060b16] text-white pt-6 pb-2 md:pt-10 md:pb-6 overflow-hidden">
        {/* Subtle mesh gradient background */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-400 blur-[100px]" />
        </div>

        <div className="container-custom relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex flex-col">
                <Link href="/" className="flex items-center justify-start">
                  <Image 
                    src="/assets/images/logos/logo.avif" 
                    alt="Admission Hands Logo" 
                    width={240}
                    height={60}
                    className="object-contain w-[200px] h-[50px] md:w-[240px] md:h-[60px]"
                    unoptimized
                  />
                </Link>
              </div>
              
              <p className="text-gray-400 text-[13px] md:text-xs font-medium leading-relaxed max-w-sm">
                {tagline || DEFAULT_TAGLINE}
              </p>
              
              <div className="flex space-x-2 md:space-x-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.key}
                    href={social.href} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("bg-white/5 w-11 h-11 rounded-lg md:rounded-xl transition-all duration-300 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center", social.color)}
                    aria-label="Social Link"
                  >
                    <social.icon size={16} className="w-4 h-4 md:w-5 md:h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Mobile Quick Links Row (Only on Mobile) */}
            <div className="lg:hidden flex flex-wrap gap-2 py-2 border-y border-white/5 mt-2">
              {quick.map((link) => (
                <Link
                  key={link.id}
                  href={link.url}
                  target={link.newTab ? '_blank' : undefined}
                  rel={link.newTab ? 'noopener noreferrer' : undefined}
                  className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-full text-[10px] font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center min-h-[44px]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            
            {/* Desktop Explore / Mobile Accordion */}
            <div className="lg:col-span-2">
              <div className="hidden lg:block space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Explore</h2>
                <ul className="space-y-2">
                  {exploreLinks.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.url}
                        target={item.newTab ? '_blank' : undefined}
                        rel={item.newTab ? 'noopener noreferrer' : undefined}
                        className="text-gray-400 hover:text-white text-xs font-bold transition-colors flex items-center group"
                      >
                        <ArrowRight className="h-3 w-3 mr-2 opacity-0 group-hover:opacity-100 transition-all -ml-5 group-hover:ml-0" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <details className="lg:hidden group border-b border-white/5 pb-1">
                <summary className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500 cursor-pointer list-none py-2 [&::-webkit-details-marker]:hidden">
                  Explore
                  <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pt-1 pb-3 pl-1">
                  <ul className="space-y-2">
                    {exploreLinks.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.url}
                          target={item.newTab ? '_blank' : undefined}
                          rel={item.newTab ? 'noopener noreferrer' : undefined}
                          className="text-gray-400 text-[11px] font-bold block py-3.5"
                        >
                          {item.label}
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
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Get in Touch</h2>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                      <Phone className="h-4 w-4" />
                    </div>
                    <a href={`tel:${phoneNumber}`} className="text-gray-300 hover:text-white text-xs font-bold transition-colors mt-1.5">
                      {phoneNumber}
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <a href={`mailto:${emailAddress}`} className="text-gray-300 hover:text-white text-xs font-bold transition-colors mt-1.5 break-all">
                      {emailAddress}
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <p className="text-gray-300 text-xs font-bold leading-relaxed mt-1">
                      {CONTACT_INFO.address}
                    </p>
                  </li>
                </ul>
              </div>

              <details className="lg:hidden group border-b border-white/5 pb-1">
                <summary className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500 cursor-pointer list-none py-2 [&::-webkit-details-marker]:hidden">
                  Get in Touch
                  <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pt-1 pb-3 pl-1">
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-cyan-400" />
                      <a href={`tel:${phoneNumber}`} className="text-gray-400 text-[11px] font-bold block py-3.5">{phoneNumber}</a>
                    </li>
                    <li className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-cyan-400" />
                      <a href={`mailto:${emailAddress}`} className="text-gray-400 text-[11px] font-bold block py-3.5">{emailAddress}</a>
                    </li>
                  </ul>
                </div>
              </details>
            </div>

            {/* Newsletter */}
            <div className="lg:col-span-3 space-y-3 lg:space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500 hidden lg:block">Updates</h2>
              <p className="text-gray-400 text-[13px] md:text-xs font-medium leading-relaxed mt-2 lg:mt-0">
                Stay updated with the latest admission notifications.
              </p>
              {/*
                This was an email box and a Subscribe button wired to nothing:
                whatever was typed was lost, on every page. There is no mail
                system behind the site, and the team works on WhatsApp — so
                the visitor asks there, which reaches a person, and costs the
                number nothing because they are messaging us.
              */}
              <button
                type="button"
                onClick={() => cta.whatsapp("Hi, please send me NEET counselling updates and admission notifications.")}
                className="flex w-full items-center justify-center gap-2 rounded-lg md:rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-3 text-[13px] md:text-xs font-bold text-white transition-all active:scale-95 shadow-lg shadow-cyan-900/20 min-h-[44px]"
              >
                <WhatsAppIcon size={16} />
                Get updates on WhatsApp
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-[12px] md:text-[10px] font-bold text-gray-500">
              &copy; {currentYear} AdmissionHands. All rights reserved.
            </p>
            <div className="flex gap-4 md:gap-6">
              <Link href="/terms#privacy" className="text-[12px] md:text-[10px] font-bold text-gray-500 hover:text-white transition-colors block py-2.5 min-h-[44px] min-w-[44px] text-center">Privacy</Link>
              <Link href="/terms#terms" className="text-[12px] md:text-[10px] font-bold text-gray-500 hover:text-white transition-colors block py-2.5 min-h-[44px] min-w-[44px] text-center">Terms</Link>
              <Link href="/terms#dpdp" className="text-[12px] md:text-[10px] font-bold text-gray-500 hover:text-white transition-colors block py-2.5 min-h-[44px] min-w-[44px] text-center">Data &amp; DPDP</Link>
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
