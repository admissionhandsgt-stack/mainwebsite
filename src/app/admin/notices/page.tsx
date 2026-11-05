import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import ZynNotices from "@/components/admin/ZynNotices";

/** Admin → Notices (Zyn): approved counselling notices onto the site, and the key that lets them in (2026-11-05). */
export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin");
  return <ZynNotices />;
}
