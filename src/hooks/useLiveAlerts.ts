"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { listRows } from "@/lib/adminApi";

export interface Alert {
  id: number;
  title: string;
  link: string;
  image_url?: string;
  is_active: boolean;
  order_index: number;
  /** Written by the official-notice feed (lib/alertFeed.ts) rather than a person. */
  auto?: boolean;
  source?: string | null;
  expires_at?: string | null;
}

export interface AlertFormData {
  id?: number;
  title: string;
  link: string;
  image_url: string;
  is_active: boolean;
  order_index: number;
}

const EMPTY_FORM: AlertFormData = {
  title: "",
  link: "",
  image_url: "",
  is_active: true,
  order_index: 0,
};

/**
 * The admin screen that edits the scrolling notice bar.
 *
 * Reads and writes both go through the admin API. It used to read the public
 * content API, which returns only live alerts — so a hidden alert vanished from
 * the admin with no way to switch it back on, and every row looked hand-written.
 * `silent` suppresses the error toast.
 */
export const useLiveAlerts = (options: { silent?: boolean } = {}) => {
  const { silent = false } = options;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState<AlertFormData>(EMPTY_FORM);
  const [editingAlert, setEditingAlert] = useState<AlertFormData | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await listRows<Alert & { link: string | null; image_url: string | null }>("alerts");
      setAlerts(
        rows.map((a) => ({
          ...a,
          link: a.link ?? "",
          image_url: a.image_url ?? undefined,
          order_index: a.order_index ?? 0,
        })),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load alerts";
      setError(msg);
      if (!silent) toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [silent]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  /* ----------------------------- admin ----------------------------- */

  const write = useCallback(
    async (method: "POST" | "PATCH" | "DELETE", body?: unknown, id?: number) => {
      const res = await fetch(`/api/admin/alerts${id ? `/${id}` : ""}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Save failed");
      await fetchAlerts();
    },
    [fetchAlerts],
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      try {
        await write("POST", newAlert);
        setNewAlert(EMPTY_FORM);
        toast.success("Alert added");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add the alert");
      }
    },
    [newAlert, write],
  );

  const handleUpdate = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!editingAlert?.id) return;
      try {
        await write("PATCH", editingAlert, editingAlert.id);
        setEditingAlert(null);
        toast.success("Alert updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update the alert");
      }
    },
    [editingAlert, write],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await write("DELETE", undefined, id);
        toast.success("Alert removed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove the alert");
      }
    },
    [write],
  );

  const handleFormChange = useCallback((field: string, value: string | boolean | number) => {
    setNewAlert((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleEditFormChange = useCallback((field: string, value: string | boolean | number) => {
    setEditingAlert((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  /**
   * Flip a single alert on or off from the list, without opening the editor.
   * `isActive` is the alert's value now; it used to be saved back unchanged,
   * so the switch did nothing.
   */
  const toggleActive = useCallback(
    async (id: number, isActive: boolean) => {
      try {
        await write("PATCH", { is_active: !isActive }, id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not change the alert");
      }
    },
    [write],
  );

  const resetForm = useCallback(() => setNewAlert(EMPTY_FORM), []);
  const startEdit = useCallback((alert: Alert) => {
    setEditingAlert({
      id: alert.id,
      title: alert.title,
      link: alert.link,
      image_url: alert.image_url ?? "",
      is_active: alert.is_active,
      order_index: alert.order_index,
    });
  }, []);
  const cancelEdit = useCallback(() => setEditingAlert(null), []);

  return {
    alerts,
    isLoading,
    error,
    newAlert,
    editingAlert,
    isEditing: editingAlert !== null,
    toggleActive,
    deleteAlert: handleDelete,
    fetchAlerts,
    handleSubmit,
    handleUpdate,
    handleDelete,
    handleFormChange,
    handleEditFormChange,
    resetForm,
    startEdit,
    cancelEdit,
  };
};
