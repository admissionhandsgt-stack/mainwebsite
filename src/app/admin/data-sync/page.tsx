import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import NmcSync from "@/components/admin/NmcSync";

/** Admin → Data sync: the NMC register and the colleges still to match (2026-10-18). */
export const dynamic = "force-dynamic";

export default async function DataSyncPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin");
  return <NmcSync />;
}
