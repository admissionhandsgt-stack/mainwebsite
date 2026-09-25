"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CloudUpload,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  DOCUMENT_TYPES,
  DOCUMENT_GROUPS,
  REQUIRED_COUNT,
  type DocumentType,
} from "@/lib/documentCatalogue";

/**
 * The student's side of the document vault.
 *
 * A checklist, not an upload box. The point of this screen is to answer "what
 * is still missing?" at a glance — somebody mid-counselling is doing this at
 * eleven at night between portal deadlines, and a pile of filenames does not
 * answer that question.
 *
 * So every one of the fourteen is always on screen, in the order the printed
 * checklist uses, and each row shows its own state. Uploading happens in
 * place; nothing navigates.
 */

interface StoredDoc {
  id: number;
  docType: string;
  name: string;
  mime: string;
  size: number;
  status: "uploaded" | "verified" | "rejected";
  note: string | null;
  uploadedAt: string;
}

const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const prettySize = (n: number) =>
  n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export default function DocumentVault() {
  const [docs, setDocs] = useState<Record<string, StoredDoc>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ slug: string; message: string } | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("load");
      const { documents } = (await res.json()) as { documents: StoredDoc[] };
      const byType: Record<string, StoredDoc> = {};
      documents.forEach((d) => {
        byType[d.docType] = d;
      });
      setDocs(byType);
    } catch {
      setError({ slug: "", message: "Could not load your documents. Refresh and try again." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (slug: string, file: File) => {
    setBusy(slug);
    setError(null);
    try {
      const body = new FormData();
      body.append("docType", slug);
      body.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "That upload did not work.");
      setDocs((d) => ({ ...d, [slug]: json.document }));
    } catch (e) {
      setError({ slug, message: e instanceof Error ? e.message : "That upload did not work." });
    } finally {
      setBusy(null);
      // Let the same file be chosen again after a failure.
      const input = inputs.current[slug];
      if (input) input.value = "";
    }
  };

  const remove = async (slug: string, id: number) => {
    setBusy(slug);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Could not remove that.");
      }
      setDocs((d) => {
        const next = { ...d };
        delete next[slug];
        return next;
      });
    } catch (e) {
      setError({ slug, message: e instanceof Error ? e.message : "Could not remove that." });
    } finally {
      setBusy(null);
    }
  };

  const done = DOCUMENT_TYPES.filter((t) => !t.optional && docs[t.slug]).length;
  const pct = Math.round((done / REQUIRED_COUNT) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Loading your documents…
      </div>
    );
  }

  return (
    <div>
      {/* ------------------------------ progress ------------------------------ */}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-heading text-lg font-bold text-foreground">
              {done === REQUIRED_COUNT ? "Everything required is in." : `${done} of ${REQUIRED_COUNT} ready`}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
              {done === REQUIRED_COUNT
                ? "Your counsellor can see these. Add the conditional ones below if they apply to you."
                : "Upload what you have — you can come back for the rest."}
            </p>
          </div>
          <span className="tnum font-heading text-3xl font-extrabold leading-none text-primary">
            {pct}%
          </span>
        </div>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={REQUIRED_COUNT}
          aria-label="Required documents uploaded"
        >
          <div
            className="h-full rounded-full bg-gradient-brand transition-all duration-500"
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
      </div>

      {error && !error.slug && (
        <p role="alert" className="mt-4 rounded-xl border border-signal-stretch/30 bg-signal-stretch/[0.07] px-4 py-3 text-[14px] text-signal-stretch">
          {error.message}
        </p>
      )}

      {/* ------------------------------ the list ------------------------------ */}
      {DOCUMENT_GROUPS.map((group) => {
        const items = DOCUMENT_TYPES.filter((t) => t.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group} className="mt-9">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {group}
            </h2>
            <ul className="mt-3 space-y-2.5">
              {items.map((type) => (
                <DocumentRow
                  key={type.slug}
                  type={type}
                  doc={docs[type.slug]}
                  busy={busy === type.slug}
                  error={error?.slug === type.slug ? error.message : null}
                  registerInput={(el) => {
                    inputs.current[type.slug] = el;
                  }}
                  onPick={(file) => upload(type.slug, file)}
                  onRemove={(id) => remove(type.slug, id)}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <p className="mt-8 flex gap-3 rounded-2xl border border-border bg-surface-2 px-5 py-4 text-[13.5px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <span>
          Your files are stored privately and are visible only to you and the AdmissionHands
          counselling team. They are never published, never linked publicly, and you can remove any
          of them until it has been checked.
        </span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- row */

function DocumentRow({
  type,
  doc,
  busy,
  error,
  registerInput,
  onPick,
  onRemove,
}: {
  type: DocumentType;
  doc?: StoredDoc;
  busy: boolean;
  error: string | null;
  registerInput: (el: HTMLInputElement | null) => void;
  onPick: (file: File) => void;
  onRemove: (id: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputId = `doc-${type.slug}`;

  const state = doc?.status ?? "missing";
  const tone =
    state === "verified"
      ? "border-signal-safe/40 bg-signal-safe/[0.05]"
      : state === "rejected"
        ? "border-signal-stretch/40 bg-signal-stretch/[0.05]"
        : doc
          ? "border-primary/30 bg-primary-soft/30"
          : "border-border bg-card";

  return (
    <li
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onPick(file);
      }}
      className={`rounded-2xl border p-4 transition-colors ${dragging ? "border-primary bg-primary-soft/60" : tone}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        {/* state marker */}
        <span
          className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            state === "verified"
              ? "bg-signal-safe/15 text-signal-safe"
              : state === "rejected"
                ? "bg-signal-stretch/15 text-signal-stretch"
                : doc
                  ? "bg-primary-soft text-primary"
                  : "border border-dashed border-border bg-surface-2 text-muted-foreground"
          }`}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : state === "verified" ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : state === "rejected" ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : doc ? (
            <FileText className="h-4 w-4" aria-hidden="true" />
          ) : (
            <CloudUpload className="h-4 w-4" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-grow">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-bold leading-snug text-foreground">{type.label}</span>
            {type.optional && (
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                If it applies
              </span>
            )}
            {state === "verified" && (
              <span className="rounded-full bg-signal-safe/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-signal-safe">
                Checked
              </span>
            )}
            {state === "rejected" && (
              <span className="rounded-full bg-signal-stretch/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-signal-stretch">
                Needs replacing
              </span>
            )}
          </p>

          {doc ? (
            <p className="mt-1 truncate text-[13px] text-muted-foreground">
              {doc.name} · {prettySize(doc.size)}
            </p>
          ) : (
            type.hint && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{type.hint}</p>
          )}

          {doc?.note && (
            <p className="mt-2 rounded-lg border border-signal-stretch/30 bg-signal-stretch/[0.07] px-3 py-2 text-[13px] leading-relaxed text-foreground">
              {doc.note}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-2 text-[13px] font-medium text-signal-stretch">
              {error}
            </p>
          )}
        </div>

        {/* actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {doc && (
            <a
              href={`/api/documents/${doc.id}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label={`Download ${type.label}`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
          {doc && doc.status !== "verified" && (
            <button
              type="button"
              onClick={() => onRemove(doc.id)}
              disabled={busy}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-signal-stretch/10 hover:text-signal-stretch disabled:opacity-40"
              aria-label={`Remove ${type.label}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <label
            htmlFor={inputId}
            className={`inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-bold transition-colors ${
              doc
                ? "border border-border text-muted-foreground hover:text-foreground"
                : "bg-gradient-brand text-white shadow-glow"
            } ${busy ? "pointer-events-none opacity-50" : ""}`}
          >
            {doc ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Replace
              </>
            ) : (
              <>
                <CloudUpload className="h-4 w-4" aria-hidden="true" />
                Upload
              </>
            )}
          </label>
          <input
            id={inputId}
            ref={registerInput}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPick(file);
            }}
          />
        </div>
      </div>
    </li>
  );
}
