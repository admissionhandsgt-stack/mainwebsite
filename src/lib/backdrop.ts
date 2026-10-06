import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { unstable_cache } from "next/cache";

/**
 * A ~1 KB inline copy of a hero backdrop, for painting with the first frame.
 *
 * The homepage's campus photograph sits behind the type at 3.5% opacity on a
 * phone (8% in dark mode, 7–10% from 640px up). It was `priority`, so every
 * visit preloaded a 27 KB image at high priority alongside the CSS — and,
 * being the largest thing on the screen, it was the page's LCP element: on
 * Google's lab run 1.1 s waiting to start and 0.75 s loading, for something
 * nobody can make out.
 *
 * At those opacities a 96px-wide copy, upscaled by the browser, is the same
 * picture: composited at the real opacity it differs from the full photograph
 * by a mean of 0.4–0.9 brightness levels out of 255 on a phone (measured
 * 2026-10-06). So a phone gets only this, inline — no request at all — while
 * from 640px up, where the photograph is at 7–10% and fine edges would be
 * lost, a <picture> source swaps in the full photograph exactly as before,
 * minus the preload. The desktop look is unchanged.
 *
 * Only files under public/ are read, and the path is checked to stay inside
 * it. Anything else (an external URL, a missing file) returns null and the
 * caller falls back to loading the photograph normally.
 */
const PUBLIC = path.join(process.cwd(), "public");

async function build(url: string): Promise<string | null> {
  if (!url.startsWith("/assets/")) return null;
  const file = path.normalize(path.join(PUBLIC, decodeURIComponent(url.split("?")[0])));
  if (!file.startsWith(PUBLIC + path.sep)) return null;
  try {
    const tiny = await sharp(await readFile(file)).resize(96).webp({ quality: 50 }).toBuffer();
    return `data:image/webp;base64,${tiny.toString("base64")}`;
  } catch {
    return null;
  }
}

export const backdropPlaceholder = unstable_cache(build, ["backdrop-placeholder-v1"], {
  revalidate: 86400,
});
