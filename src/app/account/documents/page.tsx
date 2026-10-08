import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "@/components/ui/Link";
import { ArrowLeft, FileText } from "lucide-react";
import { currentUser } from "@/lib/userAuth";
import { ACCEPTED_LABEL, MAX_BYTES } from "@/lib/documents";
import DocumentVault from "@/components/documents/DocumentVault";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your counselling documents | AdmissionHands",
  // Never indexed. There is nothing here for a crawler and the page only
  // exists for one signed-in person.
  robots: { index: false, follow: false },
};

/**
 * Where a candidate keeps the fourteen documents counselling asks for.
 *
 * They were arriving over WhatsApp, mixed into chat history, impossible to
 * audit and impossible for the student to check. Here the student can see
 * what is still missing, and the team has one place to look.
 */
export default async function DocumentsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account/documents");

  return (
    <main className="min-h-screen bg-background">
      <div className="container-custom py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/account"
            className="-ml-1 inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to your account
          </Link>

          <div className="mt-3 flex items-start gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary sm:inline-flex">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                Your counselling documents
              </h1>
              <p className="mt-2.5 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground md:text-base">
                Everything you will be asked for at reporting, in one place. Upload as you get them
                — your counsellor can see what is ready and what is still outstanding, so nothing is
                discovered missing on the day.
              </p>
              <p className="mt-3 text-[13px] text-muted-foreground">
                {ACCEPTED_LABEL} · up to {Math.round(MAX_BYTES / (1024 * 1024))} MB each
              </p>
            </div>
          </div>

          <div className="mt-9">
            <DocumentVault />
          </div>
        </div>
      </div>
    </main>
  );
}
