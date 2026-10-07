import { resolveMetadata } from '@/lib/content';
import React from 'react';
import type { Metadata } from 'next';
import { getLegalDocuments } from '@/lib/legalService';
import { extractHeadings } from '@/lib/legalService';
import { LEGAL_DOCUMENTS_FALLBACK } from '@/lib/legalFallback';
import LegalLayout from '@/components/legal/LegalLayout';
import StructuredData, { breadcrumb } from "@/components/seo/StructuredData";

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata('/terms', {
    title: 'Legal Information – AdmissionHands',
    description:
      'Terms of Service, Privacy Policy, Cookies & Tracking, DPDP Compliance, and Contact Information for AdmissionHands medical admission consultancy.',
  });
}

async function fetchLegalData() {
  try {
    const docs = await getLegalDocuments();
    if (docs && docs.length > 0) {
      return docs.map((doc) => ({
        slug: doc.slug,
        title: doc.title,
        content: doc.content,
        lastUpdated: doc.last_updated,
        headings: extractHeadings(doc.content),
      }));
    }
  } catch {
    // Supabase unavailable — fall through to fallback
  }

  return LEGAL_DOCUMENTS_FALLBACK.map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    content: doc.content,
    lastUpdated: doc.lastUpdated,
    headings: extractHeadings(doc.content),
  }));
}

export default async function TermsPage() {
  const sections = await fetchLegalData();

  const lastModified = sections.reduce((latest, s) => {
    const d = new Date(s.lastUpdated);
    return d > latest ? d : latest;
  }, new Date(0));

  return (
    <>
      <LegalLayout sections={sections} />
      <StructuredData data={breadcrumb([{ name: "Home", path: "/" }, { name: "Legal information", path: "/terms" }])} />

      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Legal Information – AdmissionHands',
            // The JSON-LD describes the page as built, so it carries the
            // shipped copy rather than whatever the admin may have overridden.
            description:
              'Terms of Service, Privacy Policy, Cookies & Tracking, DPDP Compliance, and Contact Information for AdmissionHands medical admission consultancy.',
            dateModified: lastModified.toISOString(),
            publisher: {
              '@type': 'Organization',
              name: 'AdmissionHands',
              url: 'https://www.admissionhands.com',
            },
          }),
        }}
      />
    </>
  );
}
