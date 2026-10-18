"use client";

import { useEffect } from "react";
import { aaTrack, type AAProps } from "@/lib/analytics";

/** Sends one AutoLoom event when a server-rendered page is seen (college_viewed). */
export default function TrackView({ event, props }: { event: string; props: AAProps }) {
  useEffect(() => {
    aaTrack(event, props);
    // Once per page view; the props are fixed for the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
