/**
 * The default share card for every page that does not set its own.
 *
 * WhatsApp, Facebook and LinkedIn do not render AVIF in link previews, and the
 * previous og:image was the logo as an AVIF — so on the channel this audience
 * actually shares links through, every page unfurled with no picture. A JPEG
 * at the 1200x630 the platforms crop to. Built by scripts/make_og_image.cjs.
 */
export const OG_IMAGE = {
  url: "/assets/images/og/admissionhands-1200x630.jpg",
  width: 1200,
  height: 630,
  alt: "AdmissionHands — NEET counselling built on published closing ranks",
};
