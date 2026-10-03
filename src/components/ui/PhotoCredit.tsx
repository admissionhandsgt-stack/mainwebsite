import React from "react";

/**
 * The three fields a hero needs to carry, so a component takes one prop rather
 * than three and a new field reaches every page at once.
 */
export interface PhotoCreditInfo {
  subject?: string | null;
  attribution?: string | null;
  license?: string | null;
}

/** Pull the credit out of a `media_assets` row. */
export function creditOf(
  asset?: { subject?: string | null; attribution?: string | null; license?: string | null } | null,
): PhotoCreditInfo | undefined {
  if (!asset?.attribution && !asset?.subject) return undefined;
  return { subject: asset.subject, attribution: asset.attribution, license: asset.license };
}

/**
 * The line under a photograph: which college it is, who took it, and the terms.
 *
 * ## Why every hero needs one
 *
 * The heroes used to be AI-generated and most of them carried an institution's
 * name on the building — "D.Y. PATIL MEDICAL COLLEGE" on a campus that is not
 * theirs, "SWAMI VIVEKANANDA MEDICAL COLLEGE AND HOSPITAL" with SCIENCES
 * misspelt, an invented "ROYAL INTERNATIONAL MEDICAL UNIVERSITY" on a European
 * campus under the heading "India's Finest Deemed Universities". They are
 * photographs of real Indian medical colleges now, from Wikimedia.
 *
 * That exchanges one obligation for another. CC BY and CC BY-SA are free **and
 * conditional**: the photographer has to be named wherever the picture appears.
 * A credit recorded in `media_assets` and never rendered is a condition nobody
 * met — so the component that knows the credit exists is the one that draws it.
 *
 * `subject` is not a licence condition and is here anyway. A backdrop under a
 * heading like "India's Finest Deemed Universities" invites the reader to read
 * the heading onto the building; three of those four campuses are government
 * colleges. Naming the college costs a few characters and closes it.
 *
 * ## Why it looks like this
 *
 * Small, low-contrast, bottom-right, `pointer-events-none`. It is a legal line
 * rather than content: it must be legible to anyone who looks for it and must
 * not compete with the headline it sits under. The heroes lay a ~55% dark wash
 * over the photograph, so white at 35–45% opacity reads without glowing.
 *
 * CC0 and public-domain files carry no condition. The credit is still shown,
 * because a reader cannot tell which is which and a page that names its sources
 * inconsistently looks like one that names them when it must.
 */
export default function PhotoCredit({
  subject,
  attribution,
  license,
  className = "",
  tone = "onImage",
}: {
  subject?: string | null;
  attribution?: string | null;
  license?: string | null;
  className?: string;
  /** `onImage` sits on the darkened photograph; `onSurface` on a page background. */
  tone?: "onImage" | "onSurface";
}) {
  const parts = [subject, attribution ? `© ${attribution}` : null, license].filter(Boolean);
  // Nothing to say is not the same as an empty line: render nothing at all,
  // so an un-sourced image does not grow a stray separator.
  if (parts.length === 0) return null;

  const colour =
    tone === "onImage"
      ? "text-white/45"
      : "text-slate-500/70 dark:text-slate-400/70";

  return (
    <span
      className={`pointer-events-none select-none text-[10px] leading-none ${colour} ${className}`}
    >
      {parts.join(" · ")}
    </span>
  );
}
