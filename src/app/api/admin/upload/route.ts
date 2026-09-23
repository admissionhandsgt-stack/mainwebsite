import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

/** Only formats a browser renders. Deciding by magic bytes, not by filename. */
const SIGNATURES: { ext: string; type: string; test: (b: Buffer) => boolean }[] = [
  { ext: "png", type: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "jpg", type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "gif", type: "image/gif", test: (b) => b.subarray(0, 6).toString("ascii").startsWith("GIF8") },
  { ext: "webp", type: "image/webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { ext: "avif", type: "image/avif", test: (b) => b.subarray(4, 8).toString("ascii") === "ftyp" && b.subarray(8, 12).toString("ascii").includes("avif") },
];

/**
 * Image uploads for the admin, replacing Supabase Storage.
 *
 * Files land in public/assets/images/uploads and are served as static assets —
 * the same directory the images pulled out of Supabase now live in.
 *
 * The filename from the browser is never used: it is attacker-controlled and
 * is the usual route to a path traversal or an executable extension. The name
 * is generated, and the extension comes from the file's own magic bytes.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const folderRaw = String(form.get("folder") ?? "misc");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file was sent." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "That file is empty." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Images must be under 8 MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const match = SIGNATURES.find((s) => s.test(buffer));
    if (!match) {
      return NextResponse.json(
        { error: "Only PNG, JPEG, GIF, WebP and AVIF images can be uploaded." },
        { status: 415 },
      );
    }

    // Folder is a single safe path segment, or nothing.
    const folder = folderRaw.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "misc";
    const name = `${folder}-${Date.now()}-${randomBytes(4).toString("hex")}.${match.ext}`;

    const dir = path.join(process.cwd(), "public", "assets", "images", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buffer);

    return NextResponse.json({
      url: `/assets/images/uploads/${name}`,
      contentType: match.type,
      bytes: buffer.length,
    });
  } catch (error) {
    logError(error, { route: "/api/admin/upload", request });
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
