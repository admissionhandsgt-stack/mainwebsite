import { ShieldCheck } from "lucide-react";
import { PageHeader, Card } from "@/components/admin/ui";
import DocumentsClient from "./DocumentsClient";

export const dynamic = "force-dynamic";

/**
 * Counselling documents, by candidate.
 *
 * They used to arrive over WhatsApp and live in chat history, where nobody
 * could tell whose set was complete without scrolling back through a
 * conversation. This is the same documents, in one place, with a state on each.
 */
export default function AdminDocumentsPage() {
  return (
    <div>
      <PageHeader
        title="Documents"
        description="What candidates have uploaded from their account, grouped by person. Open one to see the full checklist, download a file, mark it checked, or ask for it again with a reason the candidate will see."
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <DocumentsClient />
        </div>

        <aside className="space-y-4">
          <Card
            title={
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600" /> Handle with care
              </span>
            }
          >
            <p className="text-[13px] leading-relaxed text-slate-600">
              These are identity documents. They are held in our own database, backed up with everything
              else, and can only be opened by the candidate or by a signed-in member of staff — there is no
              shareable link and no copy anywhere else.
            </p>
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-900">
              Download one only when you need it, and delete the local copy afterwards.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
