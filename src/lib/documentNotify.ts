/**
 * Telling the team a document arrived.
 *
 * The brief was "email par ya kahin mil jaye" — reach us somewhere. There is no
 * SMTP configured on this deployment and adding one is a credential and a
 * deliverability problem; the WhatsApp gateway already exists, already works,
 * and is where this team actually operates. So that is the channel, and
 * `/admin/documents` is the place everything can be reviewed and downloaded.
 *
 * **The document itself is never sent.** Only that one arrived, from whom, and
 * which of the fourteen it was. Pushing a student's marksheet through a chat
 * gateway would put identity documents into a message history nobody controls,
 * which is the problem this vault exists to solve.
 *
 * Batched deliberately: fourteen uploads in five minutes is one person working
 * through the checklist, not fourteen events worth interrupting anybody for.
 */

import { sendWhatsAppNotification } from "@/lib/whatsappService";
import { documentType } from "@/lib/documentCatalogue";

interface UploadEvent {
  userId: number;
  name: string | null;
  phone: string;
  docType: string;
}

/** userId -> when we last said something about them. */
const lastNotified = new Map<number, number>();
const QUIET_MS = 5 * 60 * 1000;

export async function notifyDocumentUpload(event: UploadEvent): Promise<void> {
  const now = Date.now();
  const previous = lastNotified.get(event.userId) ?? 0;
  if (now - previous < QUIET_MS) return;
  lastNotified.set(event.userId, now);

  // Keep the map from growing for the lifetime of the process.
  if (lastNotified.size > 500) {
    lastNotified.forEach((at, id) => {
      if (now - at > QUIET_MS) lastNotified.delete(id);
    });
  }

  const label = documentType(event.docType)?.label ?? event.docType;

  try {
    await sendWhatsAppNotification({
      name: event.name || "A candidate",
      phone: event.phone,
      source: `Counselling documents — started with "${label}"`,
    });
  } catch {
    // Never the caller's problem: the upload succeeded either way.
  }
}
