import type { Metadata } from "next";
import { resolveMetadata } from "@/lib/content";
import RoundsPage from "@/components/rounds/RoundsPage";

export const dynamic = "force-dynamic";

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/mbbs-india/rounds", {
    title: "What Opens After NEET UG Round 1 | AdmissionHands",
    description:
      "Which MBBS seats round 1 closed above your rank and a later round reached — and which ones closed tighter afterwards. Published closing ranks, both directions.",
  });
}

export default async function UgRoundsPage({
  searchParams,
}: {
  searchParams: { rank?: string; category?: string };
}) {
  return (
    <RoundsPage
      level="ug"
      basePath="/mbbs-india/rounds"
      collegeBase="/mbbs-india/colleges"
      predictorPath="/mbbs-india/predictor"
      searchParams={searchParams}
      crumbs={[
        { name: "MBBS India", path: "/mbbs-india" },
        { name: "After round 1", path: "/mbbs-india/rounds" },
      ]}
    />
  );
}
