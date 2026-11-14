import Link from "@/components/ui/Link";
import { BadgeCheck } from "lucide-react";
import { pageCopy } from "@/lib/pageCopy";
import { currentPath, getPageDates, readableDate } from "@/lib/pageDates";
import { jsonLd } from "@/lib/jsonLd";

const SITE = "https://www.admissionhands.com";

/**
 * "Reviewed by Gulshan Tomar, Admission Strategist & Data Lead" under a data page's hero (the visible date was taken off
 * on 2026-11-10 at the owner's word; the JSON-LD keeps lastReviewed/dateModified) (owner, 2026-11-09:
 * "Gulshan Tomar Admission Counselor dikhado", and "log updated ya 2026-2027 se bhi search karte hai"). The date is
 * the page's own data date — the sitemap's lastmod for this path — never the day of the visit; a page with none shows
 * the reviewer alone. Also tells search engines, on the page's WebPage node (same @id as webPage()), who reviewed it
 * and when it last changed. Words: Admin → Content → "Site: reviewer on data pages".
 */
export default async function ReviewedBy() {
  const path = await currentPath();
  const [copy, dates, preferred] = await Promise.all([
    pageCopy("site.reviewer", {}),
    getPageDates().catch(() => ({}) as Record<string, string>),
    pageCopy("site.preferred_source", {}).catch(() => null),
  ]);
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
    // Links here are separate flex items, not words in a sentence, so they need a 24px tap target (WCAG 2.5.8; PSI flagged
    // /team and the preferred-source link on desktop, 2026-11-14).
    <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px] text-muted-foreground">
      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
      <span>{copy.label}</span>
      {href ? (
        <Link href={href} className="inline-flex min-h-6 items-center font-semibold text-foreground hover:text-primary hover:underline">
          {copy.name}
        </Link>
      ) : (
        <span className="font-semibold text-foreground">{copy.name}</span>
      )}
      {copy.role && <span>, {copy.role}</span>}
      {/* The page's own latest change (lib/pageDates.ts) — shown again the same evening (owner: "latest date hi rakhna"),
          now that it moves with notices, added seats, schedule changes and rounds; never the day of the visit. */}
      {date && (
        <>
          <span aria-hidden="true">·</span>
          <span>
            {copy.updated} <time dateTime={date}>{readableDate(date)}</time>
          </span>
        </>
      )}
      {/* Sources and checks behind the figures (2026-11-11) — not on that page itself. */}
      {copy.method && path !== "/how-we-check-data" && (
        <>
          <span aria-hidden="true">·</span>
          <Link href="/how-we-check-data" className="inline-flex min-h-6 items-center underline-offset-2 hover:text-primary hover:underline">
            {copy.method}
          </Link>
        </>
      )}
      {/* Google "Preferred Sources" (2026-11-12): readers of a data page are the ones who come back for its figures. */}
      {preferred?.reviewer && preferred.domain && (
        <>
          <span aria-hidden="true">·</span>
          <a
            href={`https://www.google.com/preferences/source?q=${encodeURIComponent(preferred.domain)}`}
            target="_blank"
            rel="noopener noreferrer"
            data-placement="reviewed_by"
            className="inline-flex min-h-6 items-center underline-offset-2 hover:text-primary hover:underline"
          >
            {preferred.reviewer}
          </a>
        </>
      )}
      {node && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(node) }} />}
    </p>
  );
}
