"use client";

import { useState } from "react";

/** Remove a search answer from its page, or put it back (POST /api/admin/search-faqs). */
export default function SearchFaqToggle({ id, status }: { id: number; status: string }) {
  const [now, setNow] = useState(status);
  const [busy, setBusy] = useState(false);
  const next = now === "live" ? "removed" : "live";
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await fetch("/api/admin/search-faqs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status: next }) });
        if (r.ok) setNow(next);
        setBusy(false);
      }}
      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${now === "live" ? "bg-white text-red-700 ring-red-200 hover:bg-red-50" : "bg-white text-emerald-700 ring-emerald-200 hover:bg-emerald-50"}`}
    >
      {busy ? "…" : now === "live" ? "Remove" : "Put back"}
    </button>
  );
}
