import { redirect } from "next/navigation";
import { getCounsellingYear } from "@/lib/mccResults";

/** /neet-pg-counselling → the counselling now running. A new page, so a temporary redirect: it moves each year. */
export default async function CounsellingIndex() {
  redirect(`/neet-pg-counselling/${await getCounsellingYear()}`);
}
