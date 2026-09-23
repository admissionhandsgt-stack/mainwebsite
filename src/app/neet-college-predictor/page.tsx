import type { Metadata } from "next";
import { resolveMetadata } from "@/lib/content";
import { getAllFacets, STREAMS } from "@/lib/predictorFacets";
import PredictorClient from "@/components/predictor/PredictorClient";
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic";

/**
 * One tool for every NEET stream.
 *
 * MBBS, BDS and MD/MS were three separate pages asking the identical question
 * — "what does my rank reach" — with three separate URLs splitting the search
 * traffic for the one phrase people actually type. The course is a filter, not
 * a different product.
 *
 * The URL is the search term. "NEET College Predictor" is what candidates
 * search; a path that matches it is worth more than a tidier taxonomy.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/neet-college-predictor", {
    title: "NEET College Predictor 2026 — MBBS, BDS & MD/MS Seats by Rank | AdmissionHands",
    description:
      "Enter your NEET rank and see the colleges it reaches — MBBS, BDS and MD/MS. Every seat placed against the round it actually closed in, from the counselling authorities' own published results.",
    keywords: [
      "NEET college predictor",
      "NEET UG college predictor",
      "NEET PG college predictor",
      "MBBS college predictor",
      "BDS college predictor",
      "MD MS seat predictor",
      "NEET rank wise college",
      "medical college predictor India",
    ].join(", "),
  });
}

export default async function NeetCollegePredictorPage() {
  const facets = await getAllFacets();

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          webPage({
            name: "NEET College Predictor",
            description:
              "Enter your NEET rank and see the MBBS, BDS or MD/MS seats it reaches, each backed by the published closing rank it came from.",
            path: "/neet-college-predictor",
          }),
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET College Predictor", path: "/neet-college-predictor" },
          ]),
          // A tool, not an article — so search engines can show it as one.
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "NEET College Predictor",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Any",
            url: "https://admissionhands.com/neet-college-predictor",
            offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
            description:
              "Check which MBBS, BDS or MD/MS seats a NEET rank reaches, from published counselling closing ranks.",
          },
        ]}
      />

      <PredictorClient streams={STREAMS} facets={facets} />
    </main>
  );
}
