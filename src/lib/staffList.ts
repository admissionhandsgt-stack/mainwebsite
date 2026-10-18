/**
 * Who on the team gets WhatsApp from the site: new-lead alerts, follow-up
 * reminders and the 10 AM digest. `alerts.staff` in integrations (JSON
 * [{ "name", "phone" }]) overrides the default; the owner's list on
 * 2026-10-16 was Gulshan Tomar and Dev Kumar.
 *
 * Server only.
 */

import { getIntegration } from "@/lib/integrations";

export interface Staff {
  name: string;
  phone: string;
}

const DEFAULT_STAFF: Staff[] = [
  { name: "Gulshan Tomar", phone: "+919220626002" },
  { name: "Dev Kumar", phone: "+917678670846" },
];

export async function staffList(): Promise<Staff[]> {
  try {
    const raw = await getIntegration("alerts.staff");
    const list = raw ? (JSON.parse(raw) as Staff[]) : DEFAULT_STAFF;
    return list.filter((s) => s?.name && /^\+?\d{10,15}$/.test(String(s.phone).replace(/[\s-]/g, "")));
  } catch {
    return DEFAULT_STAFF;
  }
}
