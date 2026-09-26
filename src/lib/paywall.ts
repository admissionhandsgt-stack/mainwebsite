/**
 * The declaration that keeps the gate from being cloaking.
 *
 * Serving a crawler more than a visitor is cloaking — a spam violation that can
 * remove a site from the index — *unless* the page says it is gated. Google's
 * paywalled-content markup is how you say it: `isAccessibleForFree: false` on
 * the page, and a `hasPart` naming the CSS selector of the section that is
 * withheld.
 *
 * So `crawler.ts` (who gets the rows) and this file (saying that not everyone
 * does) are two halves of one decision. **Never ship one without the other.**
 * A page that serves a crawler the full table and omits this markup is
 * indistinguishable from a site trying to trick Google.
 *
 * Reference: Google Search Central, "Subscription and paywalled content", and
 * the flexible-sampling guidance it sits under.
 */

/**
 * The class every gated block carries.
 *
 * One constant rather than a string in each page, because the markup below has
 * to name the same selector the section actually uses — a typo there silently
 * turns a declared paywall back into undeclared cloaking.
 */
export const GATED_CLASS = "ah-gated-depth";

/** The selector form, for the markup. */
export const GATED_SELECTOR = `.${GATED_CLASS}`;

/**
 * JSON-LD marking a page as partly gated.
 *
 * `WebPage` rather than `Article`: these are database-backed reference pages,
 * not articles, and claiming otherwise to chase a rich result would be a
 * different kind of dishonesty.
 */
export function paywallJsonLd(input: {
  url: string;
  name: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": input.url,
    url: input.url,
    name: input.name,
    description: input.description,
    // The page as a whole is free to read; part of it is not.
    isAccessibleForFree: true,
    hasPart: {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: GATED_SELECTOR,
    },
  };
}
