// Basic analytics tracking utility

export type EventPayload = {
  page?: string;
  location?: string;
  source?: string;
  type?: string;
  college_name?: string;
  [key: string]: any;
};

export const trackEvent = (eventName: string, payload?: EventPayload) => {
  if (typeof window !== 'undefined' && "gtag" in window) {
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag?.("event", eventName, payload);
  }
};
