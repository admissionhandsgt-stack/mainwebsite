/**
 * Mirroring candidate documents into Google Drive.
 *
 * ## Why OAuth and not a service account
 *
 * The obvious design is a service account — no human in the loop, no token to
 * expire. It cannot work. Since June 2023 a service account has a **0 GB Drive
 * quota** and cannot own a file at all; anything it uploads fails with
 * `storageQuotaExceeded`. The two things that do work are a Shared Drive
 * (Google Workspace only) or a refresh token for a real account, which owns
 * the files and spends its own quota.
 *
 * A refresh token works for a personal Gmail *and* for a Workspace account, so
 * that is what this uses — it cannot be the wrong choice later. `supportsAllDrives`
 * is set on every call, so if the account is later given a Shared Drive and the
 * root folder is moved there, nothing here needs changing.
 *
 * ## Why raw fetch and not `googleapis`
 *
 * The official client is tens of megabytes for four calls: refresh a token,
 * find a folder, create a folder, upload a file. It would be the largest
 * dependency in the project by a wide margin.
 *
 * ## What failure means
 *
 * Nothing here is on the critical path. The document is already saved locally
 * and already served to the student and the team before any of this runs. A
 * Drive outage, a revoked token or a full quota produces a recorded error on
 * one row, not a failed upload — see migration `0014`.
 */

import { getIntegration, getIntegrationFlag } from "@/lib/integrations";
import { logError } from "@/lib/logger";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";

/** `drive.file` only: this app can touch what it created and nothing else. */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

/**
 * Where Google sends the operator back.
 *
 * Built from the host the request arrived on, because the admin is reached at
 * `admin.admissionhands.com` in production and `localhost:3000` in
 * development, and Google matches this string exactly. Deriving it means
 * neither is hardcoded wrongly — both just have to be registered.
 *
 * Lives here rather than in the route because a Next route file may only
 * export HTTP handlers.
 */
export function driveRedirectUri(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const clean = host.split(":")[0].toLowerCase();
  const local = clean === "localhost" || clean.startsWith("127.") || clean.endsWith(".local");
  return `${local ? "http" : "https"}://${host}/api/admin/google/callback`;
}

export const ROOT_FOLDER_NAME = "AdmissionHands — Candidate Documents";

/* ----------------------------------------------------------------- token */

let token: { value: string; expires: number } | null = null;

/**
 * A current access token, refreshed when needed.
 *
 * Cached in memory because it lasts an hour and every upload needs one.
 * Refreshed sixty seconds early so a token never expires mid-request.
 */
async function accessToken(): Promise<string | null> {
  if (token && Date.now() < token.expires) return token.value;

  const [clientId, clientSecret, refresh] = await Promise.all([
    getIntegration("google.drive.client_id"),
    getIntegration("google.drive.client_secret"),
    getIntegration("google.drive.refresh_token"),
  ]);
  if (!clientId || !clientSecret || !refresh) return null;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    // A refresh that fails is almost always the token being revoked or the
    // consent screen still being in Testing, where Google expires it weekly.
    throw new Error(`Drive token refresh failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }

  const body = (await res.json()) as { access_token: string; expires_in: number };
  token = {
    value: body.access_token,
    expires: Date.now() + (body.expires_in - 60) * 1000,
  };
  return token.value;
}

/** Forces the next call to refresh. Used after the token is replaced. */
export function resetDriveToken() {
  token = null;
}

export async function driveEnabled(): Promise<boolean> {
  const [on, refresh] = await Promise.all([
    getIntegrationFlag("google.drive.enabled"),
    getIntegration("google.drive.refresh_token"),
  ]);
  return Boolean(on && refresh);
}

/* ------------------------------------------------------------------ api */

async function api(path: string, init: RequestInit = {}, base = DRIVE_API) {
  const t = await accessToken();
  if (!t) throw new Error("Google Drive is not connected.");

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${t}`,
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Drive ${path} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

/** Drive's query language takes a quoted string; a name may contain one. */
const q = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

/**
 * The folder with this name under this parent, creating it if absent.
 *
 * Searched rather than remembered blindly, so a folder deleted or renamed in
 * Drive by a person is re-created rather than producing a permanent error.
 * The caller still caches the id, because the search costs a round trip.
 */
export async function ensureFolder(name: string, parentId?: string): Promise<string> {
  const clauses = [
    `name = '${q(name)}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ];
  if (parentId) clauses.push(`'${q(parentId)}' in parents`);

  const found = (await api(
    `/files?q=${encodeURIComponent(clauses.join(" and "))}` +
      "&fields=files(id)&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true",
  )) as { files?: { id: string }[] };

  if (found.files?.length) return found.files[0].id;

  const created = (await api("/files?fields=id&supportsAllDrives=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  })) as { id: string };

  return created.id;
}

export interface UploadResult {
  id: string;
  webViewLink?: string;
}

/**
 * Creates or replaces a file.
 *
 * `existingId` updates in place, which keeps the Drive link stable when a
 * candidate re-scans a blurry certificate — anyone who bookmarked it or shared
 * it with a college still has a working link to the current version.
 *
 * Multipart rather than resumable: these are certificates and phone
 * photographs, and the route caps them at 15 MB.
 */
export async function uploadFile(opts: {
  name: string;
  mimeType: string;
  body: Buffer;
  parentId?: string;
  existingId?: string | null;
}): Promise<UploadResult> {
  const boundary = `ah${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

  const metadata: Record<string, unknown> = { name: opts.name };
  // `parents` may only be set on create; changing it on update is an error.
  if (!opts.existingId && opts.parentId) metadata.parents = [opts.parentId];

  const parts = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${opts.mimeType}\r\n\r\n`,
      "utf8",
    ),
    opts.body,
    Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"),
  ]);

  const path = opts.existingId
    ? `/files/${encodeURIComponent(opts.existingId)}?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true`
    : "/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true";

  return (await api(
    path,
    {
      method: opts.existingId ? "PATCH" : "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(parts.length),
      },
      body: new Uint8Array(parts),
    },
    DRIVE_UPLOAD,
  )) as UploadResult;
}

export async function deleteFile(fileId: string): Promise<void> {
  const t = await accessToken();
  if (!t) return;
  await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${t}` },
  }).catch(() => {});
}

/**
 * The name of a candidate's folder.
 *
 * Carries enough to identify the person without opening anything — which is
 * the whole point of asking for a folder per candidate. The phone number is
 * the identity everywhere else in this system, so it is what makes the name
 * unique when two people share a name.
 */
export function candidateFolderName(c: {
  name: string | null;
  phone: string;
  level?: string | null;
  rank?: number | null;
}): string {
  const bits = [c.name?.trim() || "Unnamed candidate", c.phone];
  if (c.rank) bits.push(`${(c.level ?? "").toUpperCase() || "NEET"} rank ${c.rank}`);
  else if (c.level) bits.push(c.level.toUpperCase());
  // Drive dislikes slashes in names; everything else is fine.
  return bits.join(" · ").replace(/[/\\]/g, "-").slice(0, 180);
}

/** Whether the connection actually works, for the admin screen to show. */
export async function driveStatus(): Promise<{
  connected: boolean;
  email: string | null;
  rootFolderId: string | null;
  error: string | null;
}> {
  const [enabled, email, root] = await Promise.all([
    driveEnabled(),
    getIntegration("google.drive.account_email"),
    getIntegration("google.drive.root_folder_id"),
  ]);

  if (!enabled) return { connected: false, email, rootFolderId: root, error: null };

  try {
    await accessToken();
    return { connected: true, email, rootFolderId: root, error: null };
  } catch (error) {
    logError(error, { route: "googleDrive:status" });
    return {
      connected: false,
      email,
      rootFolderId: root,
      error: error instanceof Error ? error.message.slice(0, 200) : "Could not reach Google.",
    };
  }
}
