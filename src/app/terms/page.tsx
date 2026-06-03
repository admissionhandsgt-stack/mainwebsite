import React from 'react';
import type { Metadata } from 'next';
import { getLegalDocuments } from '@/lib/legalService';
import { extractHeadings } from '@/lib/legalService';
import { LEGAL_DOCUMENTS_FALLBACK } from '@/lib/legalFallback';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Legal Information – AdmissionHands',
  description:
    'Terms of Service, Privacy Policy, Cookies & Tracking, DPDP Compliance, and Contact Information for AdmissionHands medical admission consultancy.',
  alternates: {
    canonical: '/terms',
  },
};

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

      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Legal Information – AdmissionHands',
            description: metadata.description,
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
