// Basic analytics tracking utility

export type EventPayload = {
  page?: string;
  location?: string;
  source?: string;
  type?: string;
  college_name?: string;
  [key: string]: any;
};

/**
 * The NEET rank as a range — the only form a rank may leave the page in, to GA4
 * or to AutoLoom (owner's rule, 2026-10-17). Empty when there is no valid rank.
 */
export function rankBand(rank: unknown): "1-10k" | "10k-25k" | "25k-50k" | "50k-1L" | "1L+" | undefined {
  const n = Number(String(rank ?? "").replace(/[,\s]/g, ""));
  if (!Number.isFinite(n) || n < 1) return undefined;
  if (n <= 10_000) return "1-10k";
  if (n <= 25_000) return "10k-25k";
  if (n <= 50_000) return "25k-50k";
  if (n <= 100_000) return "50k-1L";
  return "1L+";
}

/** Keys that could carry a person: never sent, whatever a caller passes. */
const PERSONAL_KEY = /name|phone|mobile|whatsapp_no|email|rank|roll|guardian|otp|password|(^|_)air$/i;
/** Values that look like a phone number or an email address: never sent either. */
const PERSONAL_VALUE = /@|\+?\d[\d\s-]{8,}\d/;

type Clean = Record<string, string | number | boolean>;

/**
 * What may leave the page, for GA4 and AutoLoom alike: no name, phone, email,
 * exact rank or roll number — by key or by the look of the value. rank_band is
 * the one rank-shaped key allowed: a range, never the number.
 */
function sanitize(props: Record<string, unknown> = {}): Clean {
  const clean: Clean = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === "" || (k !== "rank_band" && PERSONAL_KEY.test(k))) continue;
    if (typeof v === "string") {
      if (PERSONAL_VALUE.test(v)) continue;
      clean[k] = v.slice(0, 120);
    } else if (typeof v === "number" || typeof v === "boolean") clean[k] = v;
  }
  return clean;
}

type Gtag = (...args: unknown[]) => void;

/**
 * GA4 loads after the page (`lazyOnload` in the root layout), so an event can
 * come before `gtag` exists — a quick form, a sign-in on a slow phone. Those
 * wait here for up to 20 s instead of being dropped.
 */
const waiting: [string, Clean][] = [];
let polling = 0;
function flush() {
  const gtag = (window as Window & { gtag?: Gtag }).gtag;
  if (gtag) {
    for (const [name, params] of waiting.splice(0)) gtag("event", name, params);
    window.clearInterval(polling);
    polling = 0;
  }
}

export const trackEvent = (eventName: string, payload?: EventPayload) => {
  if (typeof window === "undefined") return;
  const params = sanitize(payload);
  const gtag = (window as Window & { gtag?: Gtag }).gtag;
  if (gtag) return gtag("event", eventName, params);
  waiting.push([eventName, params]);
  if (!polling) {
    const started = Date.now();
    polling = window.setInterval(() => {
      flush();
      if (polling && Date.now() - started > 20_000) {
        window.clearInterval(polling);
        polling = 0;
        waiting.length = 0;
      }
    }, 500);
  }
};

/* ------------------------------------------------------------- AutoLoom */

export type AAProps = Record<string, string | number | boolean | null | undefined>;

/**
 * An AutoLoom Analytics event (the SDK is loaded in the root layout, beside GA4).
 * Queued on window.aa, so an event fired before the script arrives is kept.
 * Personal data is stripped here rather than trusted to every caller: no name,
 * phone, email, NEET rank or roll number ever leaves the page.
 */
export function aaTrack(event: string, props: AAProps = {}) {
  if (typeof window === "undefined") return;
  const w = window as Window & { aa?: unknown[] };
  w.aa = w.aa || [];
  w.aa.push(["track", event, sanitize(props)]);
}

/** The course word AutoLoom reports: "mbbs", "bds" or "md-ms". */
export const aaCourse = (v: string | null | undefined) =>
  v === "pg" || v === "md-ms" ? "md-ms" : v === "bds" ? "bds" : v ? "mbbs" : undefined;

/* --------------------------------------------------------- the lead events */

export interface LeadProps {
  /** Which form: inline_lead_form, nri_quota, exit_offer, profile, predictor_profile, counselling_request. */
  form: string;
  course?: string | null;
  state?: string | null;
  /** The rank as typed — only its band is ever sent. */
  rank?: unknown;
}

/**
 * A lead, after the server has accepted it — the one call every form makes.
 * AutoLoom gets `lead_form_submitted`, GA4 gets its recommended `generate_lead`
 * with the same non-personal fields (2026-10-17).
 */
export function trackLead({ form, course, state, rank }: LeadProps) {
  if (typeof window === "undefined") return;
  const common = {
    form,
    course: aaCourse(course ?? undefined),
    state: state ?? undefined,
    rank_band: rankBand(rank),
    source_page: window.location.pathname,
  };
  aaTrack("lead_form_submitted", common);
  trackEvent("generate_lead", { ...common, lead_source: form });
}

/**
 * A new account, once the sign-in code is redeemed (an account and a lead now
 * exist). GA4's recommended `sign_up`, plus the same lead event to AutoLoom.
 */
export function trackSignUp({ course, rank }: { course?: string | null; rank?: unknown }) {
  if (typeof window === "undefined") return;
  const common = { course: aaCourse(course ?? undefined), rank_band: rankBand(rank), source_page: window.location.pathname };
  aaTrack("lead_form_submitted", { form: "sign_up", ...common });
  trackEvent("sign_up", { method: "phone_code", ...common });
}
