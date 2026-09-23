/**
 * CMS-managed images.
 *
 * Client-safe half of the media layer: the `MediaAsset` shape and the upload
 * call. Reads live in `lib/content.ts`, which opens a database connection and
 * therefore must never be imported from a component that runs in the browser.
 */


export interface MediaAsset {
  id: string;
  media_key: string;
  title: string | null;
  image_url: string;
  mobile_image_url: string | null;
  alt_text: string | null;
  section_type: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function toLegacyShape(a: {
  mediaKey: string;
  title: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  altText: string | null;
  isActive: boolean;
}): MediaAsset {
  return {
    id: a.mediaKey,
    media_key: a.mediaKey,
    title: a.title,
    image_url: a.imageUrl,
    mobile_image_url: a.mobileImageUrl,
    alt_text: a.altText,
    section_type: null,
    display_order: 0,
    is_active: a.isActive,
    created_at: "",
    updated_at: "",
  };
}

/**
 * Sends the file to /api/admin/upload, which stores it on the server and
 * returns the public path. Returns null on failure so callers can show their
 * own error rather than a thrown exception.
 */
export async function uploadMediaFile(file: File, folder: string): Promise<string | null> {
  try {
    const body = new FormData();
    body.append("file", file);
    body.append("folder", folder);

    const res = await fetch("/api/admin/upload", { method: "POST", body });
    if (!res.ok) {
      console.error("Upload failed:", await res.text());
      return null;
    }
    const { url } = (await res.json()) as { url?: string };
    return url ?? null;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
}
