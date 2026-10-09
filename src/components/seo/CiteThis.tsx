"use client";

import { useState } from "react";
import Link from "@/components/ui/Link";
import { Check, Copy, Quote } from "lucide-react";

/**
 * "Cite this data" — a ready-made link and citation for a journalist, teacher
 * or blogger using a figure from the page. A link someone chooses to copy is
 * the kind search engines count; making it one click is the whole tool.
 */
export default function CiteThis({ title, path, source }: { title: string; path: string; source: string }) {
  const url = `https://www.admissionhands.com${path}`;
  const html = `<a href="${url}">${title} — AdmissionHands</a>`;
  const text = `${title}. AdmissionHands, from ${source}. ${url}`;
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (what: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked: the text is on screen to select by hand */
    }
  };

  return (
    <aside className="rounded-2xl border border-border bg-card p-5" aria-label="Cite this data">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
        <Quote className="h-4 w-4 text-primary-strong" aria-hidden="true" /> Using these numbers? Cite the source
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Free to quote with a link back. Download the table or embed it on your site from the{" "}
        <Link href="/data" className="font-semibold text-primary-strong hover:underline">open data page</Link>.
      </p>
      {[
        { key: "html", label: "Link (HTML)", value: html },
        { key: "text", label: "Citation", value: text },
      ].map((r) => (
        <div key={r.key} className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{r.label}</span>
            <button
              type="button"
              onClick={() => copy(r.key, r.value)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {copied === r.key ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied === r.key ? "Copied" : "Copy"}
            </button>
          </div>
          <code className="mt-1 block overflow-x-auto whitespace-pre rounded-lg bg-surface-1 px-3 py-2 text-[12.5px] text-foreground">{r.value}</code>
        </div>
      ))}
    </aside>
  );
}
