const SITE = "https://www.admissionhands.com";

/**
 * Renders JSON-LD.
 *
 * A plain script tag in the page body is the App Router's supported way to
 * ship structured data — `next/head` is a Pages Router API and is ignored
 * here, which is how the site ended up shipping none of it for months.
 */
export default function StructuredData({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Built in our own code, never from user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
    </>
  );
}

/** The trail a crawler shows under the result. */
export function breadcrumb(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: SITE + t.path,
    })),
  };
}

/** Questions and answers, so they can surface directly in search. */
export function faqPage(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items
      .filter((i) => i.question && i.answer)
      .map((i) => ({
        "@type": "Question",
        name: i.question,
        acceptedAnswer: { "@type": "Answer", text: i.answer },
      })),
  };
}

/** What this page is, in one object. */
export function webPage(opts: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.name,
    description: opts.description,
    url: SITE + opts.path,
    isPartOf: {
      "@type": "WebSite",
      name: "AdmissionHands",
      url: SITE,
    },
  };
}

/** The organisation behind the site, for the knowledge panel. */
export function organization(contact?: { phone?: string | null; email?: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AdmissionHands",
    url: SITE,
    description:
      "Medical admission counselling for NEET UG and NEET PG in India, built on published counselling data.",
    ...(contact?.phone || contact?.email
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            ...(contact.phone ? { telephone: contact.phone } : {}),
            ...(contact.email ? { email: contact.email } : {}),
            areaServed: "IN",
            availableLanguage: ["en", "hi"],
          },
        }
      : {}),
  };
}
