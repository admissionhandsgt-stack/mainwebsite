import { NextResponse } from "next/server";
import counsellors from "@/data/counsellors.json";

/**
 * /chat/<counsellor-slug> → that counsellor's WhatsApp, with a greeting typed in.
 *
 * WhatsApp template buttons may not link to wa.me directly (Meta rejects it),
 * so the follow-up templates point here and this sends the student on. Only
 * the counsellors in counsellors.json resolve; anything else goes to /team.
 */
export const dynamic = "force-dynamic";

type Counsellor = { slug: string; name: string; phone: string };


export function GET(_request: Request, { params }: { params: { slug: string } }) {
  const c = (counsellors as Counsellor[]).find((x) => x.slug === params.slug);
  if (!c) return NextResponse.redirect("https://www.admissionhands.com/team", 302);
  const first = c.name.split(" ")[0];
  const text = `Hello ${first}, I would like your help with my NEET admission.`;
  return NextResponse.redirect(`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, 302);
}
