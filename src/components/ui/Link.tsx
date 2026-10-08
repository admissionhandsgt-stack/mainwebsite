import NextLink from "next/link";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

/**
 * `next/link` with prefetching off unless a link asks for it.
 *
 * Next prefetches the RSC payload of every link that scrolls into view. Measured
 * on 2026-10-08 that was 8 to 80 extra requests per page view — a state page
 * links 73 colleges — and every one of them now passes through the edge worker
 * (deploy/edge/_worker.js), which the Workers free plan caps at 100,000 a day.
 * It also put the same load on the origin. With the site answered from an
 * in-country edge, a navigation fetches its page fast enough on the click.
 *
 * Use this everywhere public; `prefetch` still works when a link needs it.
 */
const Link = forwardRef<ElementRef<typeof NextLink>, ComponentPropsWithoutRef<typeof NextLink>>(function Link(
  { prefetch = false, ...props },
  ref,
) {
  return <NextLink ref={ref} prefetch={prefetch} {...props} />;
});

export default Link;
