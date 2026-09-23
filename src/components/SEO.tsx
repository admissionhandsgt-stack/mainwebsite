import React from 'react';

interface SEOProps {
  /**
   * Accepted and ignored. These used to become meta tags via `next/head`,
   * which the App Router does not render — so they were silently doing
   * nothing. Titles and descriptions now come from each page's
   * `generateMetadata`, which the admin can override per route.
   */
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  canonical?: string;
  /** The one thing this component still emits. */
  structuredData?: object;
}

/**
 * Renders a page's JSON-LD.
 *
 * In the App Router a `<script type="application/ld+json">` in the page body
 * is the supported way to ship structured data; `next/head` is a Pages Router
 * API and is ignored here, which is why nothing this component used to render
 * ever reached the page.
 */
const SEO: React.FC<SEOProps> = ({ structuredData }) => {
  if (!structuredData) return null;

  return (
    <script
      type="application/ld+json"
      // The object is built in our own code, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

export default SEO;
