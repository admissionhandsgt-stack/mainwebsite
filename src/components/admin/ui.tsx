/**
 * The admin's building blocks (2026-10-16). Every admin screen is a header, a
 * few cards and the controls inside them; built from these, they all read as
 * one product. Light-only (the admin forces light), slate neutrals, cyan for
 * action — never blue, violet or purple (CLAUDE.md, "Colour discipline").
 *
 * Plain components and class strings, no state: usable from server and client
 * components alike.
 */

import React from "react";
import { X } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ----------------------------------------------------------------- layout */

/** The top of every screen: title, one line of what it is for, actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/** A white panel. With a title it gets a header row; `flush` drops the body padding for tables and lists. */
export function Card({
  title,
  description,
  actions,
  children,
  flush,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={cx("overflow-hidden rounded-2xl border border-slate-200 bg-white", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

/** A row of small numbers. Keep to the ones somebody acts on; a zero nobody can change is noise. */
export function Stats({ items }: { items: { label: string; value: React.ReactNode; tone?: Tone; hint?: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {items.map((s) => (
        <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <dt className="text-xs font-medium text-slate-500">{s.label}</dt>
          <dd className={cx("mt-1 text-xl font-bold tabular-nums", s.tone ? TONE_TEXT[s.tone] : "text-slate-900")}>{s.value}</dd>
          {s.hint && <p className="mt-0.5 text-[11px] text-slate-500">{s.hint}</p>}
        </div>
      ))}
    </dl>
  );
}

/** Search box plus filters, above a list. */
export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

/* ---------------------------------------------------------------- tabs */

/** Underlined tabs. Pass `href` for links or `onClick` for in-page switching. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { id: T; label: React.ReactNode; count?: number; icon?: React.ElementType }[];
  value: T;
  /**
   * Typed loosely on purpose: with `strict: false` T widens to `string`, and a
   * `setTab` typed for a narrower union would not be accepted. Any setter for
   * the tab ids fits.
   */
  onChange: (id: never) => void;
}) {
  const change = onChange as (id: T) => void;
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => change(t.id)}
            className={cx(
              "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "border-cyan-600 text-cyan-800" : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {t.icon && <t.icon className="h-4 w-4" />}
            {t.label}
            {t.count !== undefined && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- controls */

const BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-50";
export const BUTTON = {
  primary: `${BTN_BASE} bg-cyan-600 text-white hover:bg-cyan-700`,
  secondary: `${BTN_BASE} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`,
  danger: `${BTN_BASE} border border-red-200 bg-white text-red-600 hover:bg-red-50`,
  ghost: `${BTN_BASE} text-slate-600 hover:bg-slate-100`,
  dark: `${BTN_BASE} bg-slate-900 text-white hover:bg-slate-800`,
} as const;
export const SIZE = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", icon: "h-9 w-9" } as const;

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON; size?: keyof typeof SIZE }) {
  return <button type="button" {...props} className={cx(BUTTON[variant], SIZE[size], className)} />;
}

/** Inputs, selects and textareas share one look. */
export const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:bg-slate-50 disabled:text-slate-500";
export const INPUT_H = "h-10";
export const TEXTAREA = `${INPUT} py-2.5 leading-relaxed`;

/** A labelled control: label above, hint below. */
export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

/** An on/off switch with a label. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-2.5", disabled && "cursor-not-allowed opacity-60")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-cyan-600" : "bg-slate-300")}
      >
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
}

/* ---------------------------------------------------------------- status */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";
const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-slate-900",
  info: "text-cyan-700",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
};
const BADGE: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", BADGE[tone], className)}>
      {children}
    </span>
  );
}

const NOTICE: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-cyan-200 bg-cyan-50 text-cyan-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
};

/** A one-paragraph message inside the page: an error, a warning, a tip. */
export function Notice({
  tone = "info",
  title,
  children,
  icon: Icon,
  action,
  className,
}: {
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ElementType;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", NOTICE[tone], className)} role={tone === "danger" ? "alert" : undefined}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <div className="font-semibold">{title}</div>}
        {children}
      </div>
      {action}
    </div>
  );
}

/** What an empty list says — and, where there is one, the button that fills it. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: React.ElementType;
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="mt-3 text-[15px] font-semibold text-slate-800">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------- tables */

/** Table classes: wrap in TABLE.wrap, header cells TABLE.th, body cells TABLE.td. */
export const TABLE = {
  wrap: "overflow-x-auto",
  table: "w-full text-sm",
  head: "bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500",
  th: "px-4 py-2.5",
  row: "border-t border-slate-100 hover:bg-slate-50",
  td: "px-4 py-3 align-middle text-slate-700",
};

/** A modal panel from the right, for editing one record. */
export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
  width = "max-w-xl",
}: {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-slate-900/40" aria-label="Close" onClick={onClose} />
      <aside className={cx("absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl", width)}>
        <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">{footer}</footer>}
      </aside>
    </div>
  );
}
