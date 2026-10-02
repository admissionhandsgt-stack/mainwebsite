"use client";

import Image from "next/image";

/**
 * What a college looks like when we do not have a photograph of it.
 *
 * ## Why this exists
 *
 * Every PG college card was showing one of **six generic Unsplash stock
 * photos**, rotated across 251 colleges — roughly forty-two colleges each. So a
 * candidate reading about Lokmanya Tilak Municipal Medical College saw a
 * building that is not it, under its name, as if it were. That is the same
 * fault as a fee printed beside the wrong rank: arithmetically harmless,
 * completely untrue, and on a site whose whole claim is that the facts are the
 * authority's own, worse than showing nothing.
 *
 * ## Why not just source photographs
 *
 * Tried, measured, and the measurement is the reason this file exists.
 * Wikipedia was searched for twenty-five of these colleges; ten appeared to
 * match and **only four actually did**. "Shimoga Institute of Medical Sciences"
 * matched the article for the *town* of Shimoga. "Kalpana Chawla Government
 * Medical College" matched **Kalpana Chawla** — the astronaut's portrait would
 * have become a medical college's photograph. "Fakhruddin Ali Ahmed Medical
 * College" matched the President of India.
 *
 * Sixteen percent coverage, and every near-miss is a confident lie. A real
 * photograph is welcome whenever somebody can verify it — the admin uploads one
 * per college and `imageUrl` takes precedence here. What is not acceptable is a
 * photograph nobody has checked.
 *
 * ## What this draws instead
 *
 * The college's own initials, on a colour derived from its name, with its state
 * underneath. It is deterministic, so the same college always looks the same
 * and the page does not shuffle between visits. It is honest — it claims
 * nothing it does not know. And it reads as a designed identity rather than as
 * a missing image, which is the difference between looking deliberate and
 * looking broken.
 */

/**
 * Initials, from the words that identify the college.
 *
 * "Government", "Medical" and "College" are in half these names, so a naive
 * first-letters rule gives GMC to hundreds of them. The stop list drops the
 * words that carry no identity and keeps the ones that do.
 */
const NOISE = new Set([
  "the", "of", "and", "for", "a", "an",
  "dr", "shri", "sri", "smt", "late", "pt",
  "government", "govt", "medical", "college", "institute", "institution",
  "sciences", "science", "hospital", "research", "centre", "center",
  "university", "school", "studies", "post", "graduate",
]);

export function collegeInitials(name: string): string {
  const words = String(name ?? "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  const strong = words.filter((w) => !NOISE.has(w.toLowerCase()));
  // Fall back to the full name when a college is *only* made of common words,
  // which is rare but real — "Medical College, Kolkata" is its actual name.
  const source = strong.length ? strong : words;

  return source
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/**
 * A stable colour per college.
 *
 * Hashed from the name so it never moves, and drawn from the brand palette
 * rather than random hues — cyan, teal and emerald are the site's colours, and
 * a wall of arbitrary pastels would look like a different product. The
 * `signal-*` tokens are deliberately absent: those mean admission chance on
 * this site and must never be decorative.
 */
const PALETTE = [
  "from-cyan-600 to-teal-600",
  "from-teal-600 to-emerald-600",
  "from-sky-700 to-cyan-600",
  "from-cyan-700 to-sky-600",
  "from-emerald-700 to-teal-600",
  "from-teal-700 to-cyan-700",
];

function paletteFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length]!;
}

export default function CollegeVisual({
  name,
  state,
  imageUrl,
  className = "",
  sizes = "(max-width: 768px) 100vw, 400px",
  priority = false,
}: {
  name: string;
  state?: string | null;
  /** A photograph somebody has verified is this college. Anything else: omit it. */
  imageUrl?: string | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const real = imageUrl?.trim();

  if (real) {
    return (
      <Image
        src={real}
        alt={name}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${className}`}
      />
    );
  }

  const initials = collegeInitials(name);

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${paletteFor(name)} ${className}`}
      // Decorative: the college name is already the heading beside this, and a
      // screen reader repeating it here would be noise.
      role="presentation"
    >
      <span className="font-heading text-[clamp(1.75rem,6vw,2.75rem)] font-extrabold leading-none tracking-tight text-white/95">
        {initials}
      </span>
      {state && (
        <span className="mt-1.5 max-w-[80%] truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
          {state}
        </span>
      )}
    </div>
  );
}
