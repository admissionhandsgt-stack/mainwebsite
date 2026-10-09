// WhatsApp / social preview for a counsellor's digital card (public/card/*).
//   node scripts/make_card_og.cjs
// Writes public/card/gulshan-tomar-og.jpg, 1200x630 JPEG (never AVIF: WhatsApp
// does not render it — see lib/ogImage.ts).
const sharp = require("sharp");
(async () => {
  const W = 1200, H = 630;
  const logo = await sharp("public/assets/images/logos/logo-4k.avif").resize({ width: 300 }).png().toBuffer();
  const mark = await sharp("public/icon-512.png").resize({ width: 210 }).png().toBuffer();
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#10304F"/><stop offset="0.6" stop-color="#1A4268"/><stop offset="1" stop-color="#0D5A73"/>
    </linearGradient>
    <radialGradient id="glow" cx="1" cy="0" r="0.8">
      <stop offset="0" stop-color="#14E6A8" stop-opacity="0.35"/><stop offset="1" stop-color="#14E6A8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="band" x1="0" x2="1"><stop offset="0" stop-color="#14E6A8"/><stop offset="0.6" stop-color="#22D3EE"/><stop offset="1" stop-color="#0891B2"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="${H - 12}" width="${W}" height="12" fill="url(#band)"/>
  <rect x="64" y="56" width="340" height="108" rx="20" fill="#FFFFFF"/>
  <g font-family="Segoe UI, Inter, Helvetica, Arial, sans-serif">
    <text x="72" y="262" font-size="26" font-weight="700" fill="#14E6A8" letter-spacing="5">YOUR COUNSELLOR</text>
    <text x="68" y="350" font-size="88" font-weight="800" fill="#FFFFFF" letter-spacing="-2">Gulshan Tomar</text>
    <text x="72" y="408" font-size="34" font-weight="500" fill="#CFE0EE">Medical Admissions Counsellor · AdmissionHands</text>
    <g font-size="25" font-weight="700" fill="#E8F2FA">
      <rect x="72" y="460" width="196" height="54" rx="27" fill="#FFFFFF" fill-opacity="0.1" stroke="#FFFFFF" stroke-opacity="0.25"/>
      <text x="170" y="495" text-anchor="middle">MBBS &amp; BDS</text>
      <rect x="284" y="460" width="262" height="54" rx="27" fill="#FFFFFF" fill-opacity="0.1" stroke="#FFFFFF" stroke-opacity="0.25"/>
      <text x="415" y="495" text-anchor="middle">MD / MS · NEET PG</text>
      <rect x="562" y="460" width="190" height="54" rx="27" fill="#FFFFFF" fill-opacity="0.1" stroke="#FFFFFF" stroke-opacity="0.25"/>
      <text x="657" y="495" text-anchor="middle">NRI quota</text>
    </g>
    <text x="72" y="570" font-size="25" font-weight="500" fill="#9FB8CD">Noida office · WhatsApp +91 92206 26002</text>
  </g>
</svg>`;
  await sharp(Buffer.from(svg))
    .composite([
      { input: logo, left: 84, top: 66 },
      { input: mark, left: W - 290, top: 190 },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile("public/card/gulshan-tomar-og.jpg");
  console.log("wrote public/card/gulshan-tomar-og.jpg");
})();
