import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { messageSummary, receiptsArriving, VERIFY_TOKEN } from "@/lib/waLog";
import CopyCode from "@/components/seo/CopyCode";
import WhatsAppInbox from "@/components/admin/WhatsAppInbox";

/**
 * The official number's chats (+91 70230 81792), laid out like WhatsApp.
 * Built after 53 sign-in codes went undelivered between 13 and 16 October and
 * nothing could say so; the inbox and replies came the same day. A server page
 * with its own session check — the thread itself is the client component.
 */
export const dynamic = "force-dynamic";

export default async function WhatsAppInboxPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin");

  const [summary, arriving] = await Promise.all([messageSummary(), receiptsArriving()]);
  const chips = [
    { label: "Sent (24 h)", value: summary.sent, tone: "text-slate-900" },
    { label: "Delivered", value: summary.delivered, tone: "text-emerald-700" },
    { label: "Read", value: summary.read, tone: "text-sky-700" },
    { label: "Failed", value: summary.failed, tone: summary.failed ? "text-red-700" : "text-slate-900" },
    { label: "No receipt", value: summary.waiting, tone: summary.waiting ? "text-amber-700" : "text-slate-900" },
    { label: "Replies", value: summary.replies, tone: "text-slate-900" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">WhatsApp Inbox</h1>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">
            Every message from the official number, with Meta&apos;s delivery receipts, and the students&apos; replies.
            Sign-in codes are never shown.
          </p>
        </div>
        <dl className="-mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:flex-wrap sm:px-0" aria-label="Last 24 hours">
          {chips.map((c) => (
            <div key={c.label} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
              <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</dt>
              <dd className={`text-base font-bold tabular-nums ${c.tone}`}>{c.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {!arriving && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-base font-semibold text-amber-900">Webhook not connected — Meta is not reporting delivery</h2>
          <p className="mt-1 text-sm text-amber-900">
            developers.facebook.com → AdmissionHands OTP → WhatsApp → Configuration: set these two, subscribe the
            <strong> messages</strong> field, and make sure the app is published.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <CopyCode code="https://www.admissionhands.com/api/whatsapp/cloud" label="Callback URL" />
            <CopyCode code={VERIFY_TOKEN} label="Verify token" />
          </div>
        </section>
      )}

      <WhatsAppInbox />
    </div>
  );
}
