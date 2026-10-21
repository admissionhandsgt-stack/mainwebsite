"use client";
import React from 'react';
import { Mail, Phone, MapPin, ArrowRight, Instagram, Facebook, Youtube, ChevronDown } from 'lucide-react';
import Link from "@/components/ui/Link";
import Image from 'next/image';
import MobileFooter from './MobileFooter';
import { CONTACT_INFO } from '@/lib/constants';
import { useContactInfo } from '@/hooks/useContactInfo';
import { useCTA } from '@/hooks/useCTA';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { useTelegram } from '@/components/engage/TelegramLink';
import type { NavItem } from '@/lib/content';
import type { SocialLinks } from './SiteShell';

/**
 * The footer (rebuilt 2026-10-21, owner: "professional website honi chahiye").
 *
 * Light, on the page's own tokens, and laid out by Admin → Navigation:
 *   - "Footer — Explore": each top-level row with url "#" is a column heading, its sub-links the
 *     column. Loose top-level links (the old flat list) gather in one column, so the footer still
 *     reads before the rows are grouped.
 *   - "Footer — Bottom line" (footer_quick): the small links beside the copyright.
 * Below lg every column is an accordion with 44px rows; from lg the columns sit side by side.
 */
const FALLBACK_EXPLORE: NavItem[] = [
  { id: -1, label: 'MBBS India', url: '/mbbs-india', newTab: false, children: [] },
  { id: -2, label: 'MD/MS India', url: '/md-ms-india', newTab: false, children: [] },
  { id: -3, label: 'NEET College Predictor', url: '/neet-college-predictor', newTab: false, children: [] },
  { id: -4, label: 'Services', url: '/services', newTab: false, children: [] },
  { id: -5, label: 'Know Us', url: '/know-us', newTab: false, children: [] },
  { id: -6, label: 'Contact', url: '/contact', newTab: false, children: [] },
];

const FALLBACK_BOTTOM: NavItem[] = [
  { id: -11, label: 'Privacy', url: '/terms#privacy', newTab: false, children: [] },
  { id: -12, label: 'Terms', url: '/terms#terms', newTab: false, children: [] },
  { id: -13, label: 'Data & DPDP', url: '/terms#dpdp', newTab: false, children: [] },
];

const DEFAULT_TAGLINE =
  'Admission counselling for MBBS & PG medical seats in India. Expert guidance and transparent processes for your career.';

const DEFAULT_SOCIAL: Required<SocialLinks> = {
  facebook: 'https://facebook.com/admissionhands',
  instagram: 'https://www.instagram.com/admissionhandss?igsh=cDEyd2dsdXBpeW5v',
  youtube: 'https://youtube.com/@admissionhands',
  google: CONTACT_INFO.google,
};

interface FooterProps {
  explore?: NavItem[];
  quickLinks?: NavItem[];
  tagline?: string;
  social?: SocialLinks;
}

type Column = { id: number; label: string; links: NavItem[] };

/** Group rows become columns; loose links share one "Explore" column, placed first. */
function columnsOf(items: NavItem[]): Column[] {
  const groups = items.filter((i) => (!i.url || i.url === '#') && i.children.length > 0);
  const loose = items.filter((i) => i.url && i.url !== '#');
  const cols: Column[] = groups.map((g) => ({ id: g.id, label: g.label, links: g.children }));
  if (loose.length) cols.unshift({ id: -100, label: groups.length ? 'More' : 'Explore', links: loose });
  return cols;
}

const linkProps = (l: NavItem) => (l.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {});

const Footer: React.FC<FooterProps> = ({ explore, quickLinks, tagline, social }) => {
  const currentYear = new Date().getFullYear();
  const { contactInfo } = useContactInfo();
  const cta = useCTA();
  const telegram = useTelegram();
  const phoneNumber = contactInfo?.phone_number || CONTACT_INFO.phone;
  // "+919310301949" reads as "+91 93103 01949"; anything else is shown as it was entered.
  const phoneShown = /^\+91\d{10}$/.test(phoneNumber.replace(/\s/g, ''))
    ? phoneNumber.replace(/\s/g, '').replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')
    : phoneNumber;
  const emailAddress = contactInfo?.email || CONTACT_INFO.email;

  const columns = columnsOf(explore?.length ? explore : FALLBACK_EXPLORE);
  const bottom = quickLinks?.length ? quickLinks : FALLBACK_BOTTOM;

  // An empty setting means "use what shipped"; a blank URL hides that icon.
  const socialLinks = [
    { key: 'facebook', label: 'Facebook', icon: Facebook, href: social?.facebook ?? DEFAULT_SOCIAL.facebook },
    { key: 'instagram', label: 'Instagram', icon: Instagram, href: social?.instagram ?? DEFAULT_SOCIAL.instagram },
    { key: 'youtube', label: 'YouTube', icon: Youtube, href: social?.youtube ?? DEFAULT_SOCIAL.youtube },
    { key: 'telegram', label: 'Telegram', icon: TelegramIcon, href: telegram.url },
  ].filter((s) => s.href);
  const googleProfile = social?.google ?? DEFAULT_SOCIAL.google;

  const contactRow = 'flex min-h-[44px] items-start gap-3 text-[14px] text-muted-foreground transition-colors hover:text-primary-strong dark:hover:text-primary';
  const iconBox = 'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-strong dark:text-primary';

  return (
    <>
      <footer className="relative border-t border-border bg-surface-1 text-foreground">
        <div className="container-custom pb-4 pt-10 md:pt-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(240px,0.85fr)_minmax(0,3.2fr)] lg:gap-12">
            {/* Who we are and how to reach us */}
            <div className="space-y-5">
              <Link href="/" className="inline-flex min-h-[44px] items-center" aria-label="Admission Hands — home">
                <Image
                  src="/assets/images/logos/logo.avif"
                  alt="Admission Hands Logo"
                  width={220}
                  height={55}
                  className="h-[46px] w-[184px] object-contain dark:brightness-110"
                  unoptimized
                />
              </Link>
              <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">{tagline || DEFAULT_TAGLINE}</p>

              <ul className="space-y-1">
                <li>
                  <a href={`tel:${phoneNumber}`} className={contactRow}>
                    <span className={iconBox}><Phone className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="pt-1.5 font-semibold text-foreground tnum">{phoneShown}</span>
                  </a>
                </li>
                <li>
                  <a href={`mailto:${emailAddress}`} className={contactRow}>
                    <span className={iconBox}><Mail className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="break-all pt-1.5">{emailAddress}</span>
                  </a>
                </li>
                <li>
                  {googleProfile ? (
                    <a href={googleProfile} target="_blank" rel="noopener noreferrer" data-placement="footer_google" className={contactRow}>
                      <span className={iconBox}><MapPin className="h-4 w-4" aria-hidden="true" /></span>
                      <span className="pt-1 leading-relaxed">
                        {CONTACT_INFO.address}
                        <span className="block text-[12.5px] font-semibold text-primary-strong dark:text-primary">See us on Google Maps</span>
                      </span>
                    </a>
                  ) : (
                    <p className={contactRow}>
                      <span className={iconBox}><MapPin className="h-4 w-4" aria-hidden="true" /></span>
                      <span className="pt-1 leading-relaxed">{CONTACT_INFO.address}</span>
                    </p>
                  )}
                </li>
              </ul>

              <div className="flex flex-wrap gap-2">
                {socialLinks.map((s) => (
                  <a
                    key={s.key}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-placement={`footer_${s.key}`}
                    aria-label={`Admission Hands on ${s.label}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary-strong dark:hover:text-primary"
                  >
                    <s.icon size={18} className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </div>

              {/*
                This was an email box and a Subscribe button wired to nothing: whatever was typed was
                lost, on every page. There is no mail system behind the site, and the team works on
                WhatsApp — so the visitor asks there, which reaches a person.
              */}
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <button
                  type="button"
                  onClick={() => cta.whatsapp('Hi, please send me NEET counselling updates and admission notifications.')}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-accent px-4 text-[13.5px] font-bold text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  <WhatsAppIcon size={16} /> Updates on WhatsApp
                </button>
                <a
                  href={telegram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-placement="footer"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:border-primary/40"
                >
                  <TelegramIcon size={17} className="text-[#229ED9]" /> Join on Telegram
                </a>
              </div>
            </div>

            {/* The site, by course — Admin → Navigation → Footer — Explore */}
            <nav aria-label="Footer">
              <div className="hidden gap-x-6 gap-y-10 lg:grid lg:grid-cols-3 xl:grid-cols-5">
                {columns.map((col) => (
                  <div key={col.id} className="min-w-0">
                    <h2 className="text-[12px] font-bold uppercase leading-snug tracking-[0.1em] text-foreground">{col.label}</h2>
                    <ul className="mt-3 space-y-0.5">
                      {col.links.map((l) => (
                        <li key={l.id}>
                          <Link
                            href={l.url}
                            {...linkProps(l)}
                            className="group inline-flex items-center gap-1 py-1.5 text-[14px] leading-snug text-muted-foreground transition-colors hover:text-primary-strong dark:hover:text-primary"
                          >
                            {l.label}
                            <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-border rounded-2xl border border-border bg-card lg:hidden">
                {columns.map((col) => (
                  <details key={col.id} className="group">
                    <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-4 text-[14px] font-bold text-foreground [&::-webkit-details-marker]:hidden">
                      {col.label}
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <ul className="grid gap-x-4 px-2 pb-2 sm:grid-cols-2">
                      {col.links.map((l) => (
                        <li key={l.id}>
                          <Link
                            href={l.url}
                            {...linkProps(l)}
                            className="flex min-h-[44px] items-center rounded-lg px-2 text-[14px] text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                          >
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </nav>
          </div>

          {/* The bottom line — Admin → Navigation → Footer — Bottom line */}
          <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-4 md:flex-row">
            <p className="text-[13px] text-muted-foreground">&copy; {currentYear} AdmissionHands. All rights reserved.</p>
            <ul className="flex flex-wrap items-center justify-center gap-x-1">
              {bottom.map((l) => (
                <li key={l.id}>
                  <Link
                    href={l.url}
                    {...linkProps(l)}
                    className="flex min-h-[44px] items-center px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" /> {/* Spacer for floating CTA icons */}
      </footer>

      <MobileFooter />
    </>
  );
};

export default Footer;
