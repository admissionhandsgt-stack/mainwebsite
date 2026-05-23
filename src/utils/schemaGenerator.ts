
/**
 * Utility functions for generating structured data for SEO
 */

/**
 * Generate Organization schema
 */
export const generateOrganizationSchema = (overrides = {}) => {
  const baseSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "AdmissionHands",
    "url": "https://www.admissionhands.com",
    "logo": "https://lovable.dev/opengraph-image-p98pqg.png",
    "description": "Expert guidance for medical college admissions in India",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+919873133846",
      "contactType": "customer service"
    },
    "sameAs": [
      "https://www.facebook.com/admissionhands",
      "https://twitter.com/admission_hands",
      "https://www.linkedin.com/company/admissionhands"
    ]
  };

  return { ...baseSchema, ...overrides };
};

/**
 * Generate FAQ schema
 */
export const generateFAQSchema = (questions: Array<{question: string, answer: string}>) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": questions.map(q => ({
      "@type": "Question",
      "name": q.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": q.answer
      }
    }))
  };
};

/**
 * Generate WebPage schema
 */
export const generateWebPageSchema = (name: string, description: string, overrides = {}) => {
  const baseSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": name,
    "description": description,
    "publisher": {
      "@type": "Organization",
      "name": "AdmissionHands",
      "logo": "https://lovable.dev/opengraph-image-p98pqg.png"
    }
  };

  return { ...baseSchema, ...overrides };
};

/**
 * Generate BreadcrumbList schema
 */
export const generateBreadcrumbSchema = (items: Array<{name: string, item: string}>) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.item
    }))
  };
};

/**
 * Generate Service schema
 */
export const generateServiceSchema = (name: string, description: string, overrides = {}) => {
  const baseSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": name,
    "description": description,
    "provider": {
      "@type": "Organization",
      "name": "AdmissionHands",
      "logo": "https://lovable.dev/opengraph-image-p98pqg.png"
    }
  };

  return { ...baseSchema, ...overrides };
};
