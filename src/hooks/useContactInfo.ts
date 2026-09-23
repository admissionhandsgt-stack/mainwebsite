"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface ContactInfo {
  id?: number;
  email: string;
  phone_number: string;
  whatsapp_number: string;
  lead_notification_phone: string;
}

/**
 * Site-wide contact details.
 *
 * Starts from the values in `lib/constants.ts` so the phone and WhatsApp
 * buttons work on first paint, then replaces them with whatever the admin has
 * set. A failed fetch leaves the defaults in place rather than blanking the
 * CTAs — a visitor with no number to call is worse than a slightly stale one.
 */
const FALLBACK: ContactInfo = {
  email: "info@admissionhands.com",
  phone_number: "+919310301949",
  whatsapp_number: "+919310301949",
  lead_notification_phone: "+919310301949",
};

export const useContactInfo = () => {
  const [contactInfo, setContactInfo] = useState<ContactInfo>(FALLBACK);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContactInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/contact");
      if (!res.ok) throw new Error("Failed to load contact details");
      const { data } = await res.json();
      if (data) {
        setContactInfo({
          email: data.email ?? FALLBACK.email,
          phone_number: data.phoneNumber ?? FALLBACK.phone_number,
          whatsapp_number: data.whatsappNumber ?? FALLBACK.whatsapp_number,
          lead_notification_phone: data.leadNotificationPhone ?? FALLBACK.lead_notification_phone,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contact details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContactInfo();
  }, [fetchContactInfo]);

  /** Admin: save new contact details. */
  const updateContactInfo = useCallback(
    async (patch: Partial<ContactInfo>) => {
      try {
        const res = await fetch("/api/admin/contact", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Could not save");
        await fetchContactInfo();
        toast.success("Contact details saved");
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save");
        return false;
      }
    },
    [fetchContactInfo],
  );

  /** Field-level change handler used by the admin form. */
  const handleFormChange = useCallback((field: string, value: string) => {
    setContactInfo((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      return updateContactInfo(contactInfo);
    },
    [contactInfo, updateContactInfo],
  );

  return {
    contactInfo,
    isLoading,
    error,
    fetchContactInfo,
    refetch: fetchContactInfo,
    updateContactInfo,
    handleFormChange,
    handleSubmit,
  };
};
