// Builds public/assets/images/og/admissionhands-1200x630.jpg — the default share card.
// WhatsApp and Facebook do not render AVIF previews, so the old og:image (the logo as AVIF) unfurled as nothing.
// Run: node scripts/make_og_image.cjs   (re-run after a logo or tagline change; give the file a new name if it must refresh at once)
const sharp = require('sharp');
(async () => {
  const W = 1200, H = 630;
  const logo = await sharp('public/assets/images/logos/logo-4k.avif').resize({ width: 470 }).png().toBuffer();
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="band" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#0F766E"/><stop offset="0.55" stop-color="#0891B2"/><stop offset="1" stop-color="#22D3EE"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.95" cy="0.05" r="0.7">
      <stop offset="0" stop-color="#CFFAFE"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="${H - 14}" width="${W}" height="14" fill="url(#band)"/>
  <g font-family="Segoe UI, Inter, Helvetica, Arial, sans-serif">
    <text x="72" y="300" font-size="60" font-weight="800" fill="#0F172A" letter-spacing="-1.5">NEET counselling, built on</text>
    <text x="72" y="372" font-size="60" font-weight="800" fill="#0891B2" letter-spacing="-1.5">published closing ranks</text>
    <text x="72" y="436" font-size="29" font-weight="500" fill="#334155">College predictor · cutoffs · fees — MBBS, BDS and MD/MS</text>
    <g font-size="23" font-weight="700">
      <rect x="72" y="476" width="250" height="50" rx="25" fill="#ECFEFF" stroke="#A5F3FC"/>
      <text x="197" y="509" text-anchor="middle" fill="#0E7490">2,168 PG colleges</text>
      <rect x="338" y="476" width="290" height="50" rx="25" fill="#ECFEFF" stroke="#A5F3FC"/>
      <text x="483" y="509" text-anchor="middle" fill="#0E7490">2.7 lakh closing ranks</text>
      <rect x="644" y="476" width="280" height="50" rx="25" fill="#F0FDF4" stroke="#BBF7D0"/>
      <text x="784" y="509" text-anchor="middle" fill="#15803D">Free college predictor</text>
    </g>
    <text x="${W - 72}" y="580" text-anchor="end" font-size="24" font-weight="600" fill="#64748B">admissionhands.com</text>
  </g>
</svg>`;
  await sharp(Buffer.from(svg))
    .composite([{ input: logo, left: 64, top: 52 }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile('public/assets/images/og/admissionhands-1200x630.jpg');
  const m = await sharp('public/assets/images/og/admissionhands-1200x630.jpg').metadata();
  console.log(m.width, m.height, m.size);
})();
