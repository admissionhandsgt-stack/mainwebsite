import DocumentsClient from "./DocumentsClient";
import DrivePanel from "./DrivePanel";

export const dynamic = "force-dynamic";

/**
 * Counselling documents, by candidate.
 *
 * They used to arrive over WhatsApp and live in chat history, where nobody
 * could tell whose set was complete without scrolling back through a
 * conversation. This is the same documents, in one place, with a state on each.
 */
export default function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: { drive?: string };
}) {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-gray-500">
          What candidates have uploaded from their account, grouped by person. Open one to see the
          full checklist, download a file, mark it checked, or ask for it again with a reason the
          candidate will see on their own screen.
        </p>
      </div>

      <DrivePanel flash={searchParams.drive} />

      <DocumentsClient />

      <p className="max-w-[70ch] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
        These are identity documents. They are stored outside the public web root and can only be
        opened by the candidate or by a signed-in member of staff — there is no shareable link.
        Download them only when you need them, and delete local copies afterwards.
      </p>
    </div>
  );
}
