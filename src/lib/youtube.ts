/**
 * The 11-character YouTube id, whatever was actually pasted in.
 *
 * The admin field says "video ID", but the thing a person has in their hand is
 * the URL from YouTube's own Share button — so that is what gets pasted, and
 * two of the three live rows held a full `https://youtu.be/...?si=...` link.
 * The thumbnail URL then read
 * `img.youtube.com/vi/https://youtu.be/ID?si=.../mqdefault.jpg`, which is a
 * broken image, and the player was handed the same nonsense as its id.
 *
 * Normalising on read rather than repairing those two rows is the fix that
 * holds: the next person to paste a share link is not recreating the bug.
 * Every URL form YouTube hands out is accepted, and a bare id passes through.
 *
 * **This file must stay free of database imports.** `FeaturedVideos` is a
 * client component and needs this function; pulling it from `lib/videos.ts`
 * would drag the `postgres` driver into the browser bundle and fail the build
 * with `Can't resolve 'net'` — which is exactly how `BackendImage` broke once.
 */
export function youtubeId(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";

  // Already an id: exactly the 11 characters YouTube uses.
  if (/^[\w-]{11}$/.test(value)) return value;

  const patterns = [
    /[?&]v=([\w-]{11})/, // watch?v=ID
    /youtu\.be\/([\w-]{11})/, // youtu.be/ID
    /\/embed\/([\w-]{11})/, // /embed/ID
    /\/shorts\/([\w-]{11})/, // /shorts/ID
    /\/live\/([\w-]{11})/, // /live/ID
    /\/v\/([\w-]{11})/, // /v/ID
  ];
  for (const p of patterns) {
    const m = value.match(p);
    if (m) return m[1];
  }

  // Nothing recognisable. Returning "" beats returning the input — an empty id
  // renders no thumbnail, where a URL renders a visibly broken one.
  return "";
}
