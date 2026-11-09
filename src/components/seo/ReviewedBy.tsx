import Link from "@/components/ui/Link";
import { BadgeCheck } from "lucide-react";
import { pageCopy } from "@/lib/pageCopy";
import { currentPath, getPageDates, readableDate } from "@/lib/pageDates";
import { jsonLd } from "@/lib/jsonLd";

const SITE = "https://www.admissionhands.com";

/**
 * "Reviewed by Gulshan Tomar, Admission Counselor · Updated 9 Nov 2026" under a data page's hero (owner, 2026-11-09:
 * "Gulshan Tomar Admission Counselor dikhado", and "log updated ya 2026-2027 se bhi search karte hai"). The date is
 * the page's own data date — the sitemap's lastmod for this path — never the day of the visit; a page with none shows
 * the reviewer alone. Also tells search engines, on the page's WebPage node (same @id as webPage()), who reviewed it
 * and when it last changed. Words: Admin → Content → "Site: reviewer on data pages".
 */
export default async function ReviewedBy() {
  const path = await currentPath();
  const [copy, dates] = await Promise.all([pageCopy("site.reviewer", {}), getPageDates().catch(() => ({}) as Record<string, string>)]);
  const date = path ? (dates as Record<string, string>)[path] ?? null : null;
  if (!copy.name) return null;
  const href = copy.link?.startsWith("/") ? copy.link : null;
  const node = path
    ? {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${SITE}${path}`,
        reviewedBy: {
          "@type": "Person",
          name: copy.name,
          jobTitle: copy.role || undefined,
          worksFor: { "@type": "Organization", name: "AdmissionHands", url: SITE },
          ...(href ? { url: `${SITE}${href}` } : {}),
        },
        ...(date ? { lastReviewed: date, dateModified: date } : {}),
      }
    : null;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px] text-muted-foreground">
      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
      <span>{copy.label}</span>
      {href ? (
        <Link href={href} className="font-semibold text-foreground hover:text-primary hover:underline">
          {copy.name}
        </Link>
      ) : (
        <span className="font-semibold text-foreground">{copy.name}</span>
      )}
      {copy.role && <span>, {copy.role}</span>}
      {date && (
        <>
          <span aria-hidden="true">·</span>
          <span>
            {copy.updated} <time dateTime={date}>{readableDate(date)}</time>
          </span>
        </>
      )}
      {node && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(node) }} />}
    </p>
  );
}
