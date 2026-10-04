import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Serves an uploaded image that Next did not see when it booted.
 *
 * ## Why this route exists
 *
 * Next's standalone server lists `public/` once, at startup
 * (`publicFolderItems` in next/dist/server/lib/router-utils/filesystem.js), and
 * serves only what is in that list. The release symlinks
 * `public/assets/images/uploads` at the shared upload directory, so a file the
 * admin uploads after boot is not in the list and answered 404 — every image
 * the CMS ever accepted was invisible until the next deploy restarted the
 * service. An admin uploaded a photograph of ACPM Medical College, the row was
 * written, the file was on disk, and the page showed nothing.
 *
 * A request that misses that list falls through to the app's routes, which is
 * how it reaches this one. A file that *was* there at boot never gets here;
 * Next's own static handler answers it first.
 *
 * ## Why Caddy is not enough on its own
 *
 * Caddy serves `/assets/images/uploads/*` straight from disk, so a browser
 * asking for the file directly never reaches Node. But `next/image` does not
 * ask through Caddy: its optimiser fetches the source through Next's own
 * request handler, in-process. Without this route a new upload would load as
 * a raw file and fail as an optimised one — which is how almost every image on
 * the site is rendered.
 *
 * ## What it will and will not serve
 *
 * Only the formats the upload route accepts, with the content type taken from
 * a fixed table — never sniffed, never from the request. No SVG: an SVG is a
 * document that can carry script, and serving one from this origin would run
 * it against a signed-in session. The resolved path must stay inside the
 * upload directory after symlinks are followed.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};

const UPLOADS = path.join(process.cwd(), "public", "assets", "images", "uploads");

/**
 * Names /api/admin/upload generates: `<folder>-<13-digit ms>-<8 hex>.<ext>`.
 *
 * Such a file is never rewritten — the next upload gets a new name — so it can
 * be cached for a year. Anything else under uploads/ is written by a script
 * under a fixed name (the hero images, the slug-named college photographs) and
 * may be replaced in place, so it gets a day. The same rule lives in the
 * Caddyfile; if one changes, change both.
 */
const IMMUTABLE_NAME = /-\d{13}-[0-9a-f]{8}\.[a-z0-9]+$/;

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } },
) {
  const segments = params.path ?? [];

  // Reject anything that could step outside the directory before touching the
  // filesystem at all. The realpath check below is the real boundary; this
  // keeps obvious attempts from costing a syscall.
  if (
    segments.length === 0 ||
    segments.some((s) => !s || s === "." || s === ".." || s.startsWith(".") || /[\\\0]/.test(s))
  ) {
    return notFound();
  }

  const ext = path.extname(segments[segments.length - 1]).slice(1).toLowerCase();
  const type = TYPES[ext];
  if (!type) return notFound();

  try {
    const base = await realpath(UPLOADS);
    const file = await realpath(path.join(UPLOADS, ...segments));
    if (!file.startsWith(base + path.sep)) return notFound();

    const info = await stat(file);
    if (!info.isFile()) return notFound();

    const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
    const cache = IMMUTABLE_NAME.test(file)
      ? "public, max-age=31536000, immutable"
      : "public, max-age=86400, stale-while-revalidate=2592000";

    const headers = {
      "Content-Type": type,
      "Cache-Control": cache,
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    };

    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers });
    }

    const body = await readFile(file);
    return new Response(body, {
      status: 200,
      headers: { ...headers, "Content-Length": String(body.length) },
    });
  } catch {
    // ENOENT, EACCES, a dangling symlink: all the same answer to the caller.
    return notFound();
  }
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
