import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import StateTemplate from "@/components/mbbs/StateTemplate";

type Props = {
  params: { stateName: string }
};

export function generateMetadata({ params }: Props): Metadata {
  const stateName = params.stateName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  return {
    title: `MBBS Admission in ${stateName} 2026 | Colleges & Counselling`,
    description: `Complete guide for MBBS in ${stateName}. View medical colleges, seat distribution, and counselling details.`,
  };
}

export default function MBBSStatePage({ params }: Props) {
  if (!params.stateName) {
    notFound();
  }

  const formatStateName = (slug: string): string => {
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formattedName = formatStateName(params.stateName);

  return <StateTemplate stateName={formattedName} />;
}
