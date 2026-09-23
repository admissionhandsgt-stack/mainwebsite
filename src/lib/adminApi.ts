/**
 * Browser-side client for the admin API.
 *
 * Every admin screen went through the Supabase JS client before; they now all
 * go through `/api/admin/*`, which enforces the session and the column
 * allow-list server-side. Keeping the calls in one place means a screen never
 * has to know the URL shape or how errors come back.
 */

export interface AdminError extends Error {
  status: number;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const err = new Error(
      payload.error ??
        (res.status === 401
          ? "Your session has expired. Please sign in again."
          : "The server could not complete that request."),
    ) as AdminError;
    err.status = res.status;
    throw err;
  }

  return res.json();
}

/** Every row in a resource, already ordered by the server. */
export async function listRows<T>(resource: string): Promise<T[]> {
  const { data } = await request<{ data: T[] }>(`/api/admin/${resource}`);
  return data ?? [];
}

export async function createRow<T>(resource: string, values: Record<string, unknown>): Promise<T> {
  const { data } = await request<{ data: T }>(`/api/admin/${resource}`, {
    method: "POST",
    body: JSON.stringify(values),
  });
  return data;
}

export async function updateRow<T>(
  resource: string,
  id: number | string,
  values: Record<string, unknown>,
): Promise<T> {
  const { data } = await request<{ data: T }>(`/api/admin/${resource}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
  return data;
}

/** Singleton resources (contact details) are edited without an id. */
export async function updateSingleton<T>(
  resource: string,
  values: Record<string, unknown>,
): Promise<T> {
  const { data } = await request<{ data: T }>(`/api/admin/${resource}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
  return data;
}

export async function deleteRow(resource: string, id: number | string): Promise<void> {
  await request(`/api/admin/${resource}/${id}`, { method: "DELETE" });
}

/**
 * Uploads an image and returns the public path to store on the row.
 * `folder` groups the files on disk; it is sanitised server-side.
 */
export async function uploadImage(file: File, folder = "misc"): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? "The image could not be uploaded.");
  }
  const { url } = await res.json();
  return url as string;
}
