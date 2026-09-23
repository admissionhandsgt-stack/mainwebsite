import type { Metadata } from "next";
import { resolveMetadata } from "@/lib/content";
import RoundsPage from "@/components/rounds/RoundsPage";

export const dynamic = "force-dynamic";

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/md-ms-india/rounds", {
    title: "What Opens After NEET PG Round 1 | AdmissionHands",
    description:
      "Which MD/MS seats round 1 closed above your rank and a later round reached — and which ones closed tighter afterwards. Published closing ranks, both directions.",
  });
}

export default async function PgRoundsPage({
  searchParams,
}: {
  searchParams: { rank?: string; category?: string };
}) {
  return (
    <RoundsPage
      level="pg"
      basePath="/md-ms-india/rounds"
      collegeBase="/md-ms-india/colleges"
      predictorPath="/md-ms-india/predictor"
      searchParams={searchParams}
      crumbs={[
        { name: "MD/MS India", path: "/md-ms-india" },
        { name: "After round 1", path: "/md-ms-india/rounds" },
      ]}
    />
  );
}
