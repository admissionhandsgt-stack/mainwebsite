// Counsellors' digital cards: one HTML page, one vCard and one WhatsApp
// preview image each, from scripts/cards/template.html and the list below.
//
//   node scripts/make_cards.cjs
//
// Writes public/card/<slug>.html, <slug>.vcf and <slug>-og.jpg. The card is
// shared as https://www.admissionhands.com/<slug> — next.config.mjs rewrites
// every slug it finds in public/card/ — and /card/<slug> keeps working for
// links already sent. To add a counsellor: add them to src/data/counsellors.json,
// run this, deploy — the /team page picks them up from the same file.
const fs = require("fs");
const sharp = require("sharp");

// One list for the cards and the /team page.
const COUNSELLORS = JSON.parse(fs.readFileSync("src/data/counsellors.json", "utf8"));

const SITE = "https://www.admissionhands.com";
const template = fs.readFileSync("scripts/cards/template.html", "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pretty = (p) => `+91 ${p.slice(2, 7)} ${p.slice(7)}`;

for (const c of COUNSELLORS) {
  if (!/^91[6-9]\d{9}$/.test(c.phone)) throw new Error(`${c.slug}: phone must be 91 + 10 digits`);
  const first = c.name.split(" ")[0];
  const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const values = {
    NAME: esc(c.name), FIRST: encodeURIComponent(first), INITIALS: initials, TITLE: esc(c.title),
    PHONE: c.phone, PHONE_PRETTY: pretty(c.phone), EMAIL: c.email, SLUG: c.slug,
    FILE: c.name.replace(/\s+/g, "-"),
    ORG: esc(c.org || "AdmissionHands"),
    AVATAR: c.photo
      ? `<div class="avatar"><img src="/card/${c.photo}" alt="${esc(c.name)}" width="76" height="76"></div>`
      : `<div class="avatar" aria-hidden="true">${initials}</div>`,
  };
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, k) => {
    if (!(k in values)) throw new Error(`template token ${k} has no value`);
    return values[k];
  });
  fs.writeFileSync(`public/card/${c.slug}.html`, html);

  // vCard 3.0: CRLF lines; commas inside a component are escaped.
  const [given, ...rest] = c.name.split(" ");
  const vcf = [
    "BEGIN:VCARD", "VERSION:3.0",
    `N:${rest.join(" ")};${given};;;`, `FN:${c.name}`, "ORG:AdmissionHands", `TITLE:${c.title}`,
    `TEL;TYPE=CELL,VOICE:+${c.phone}`, `EMAIL;TYPE=INTERNET,WORK:${c.email}`,
    "ADR;TYPE=WORK:;;915\, Bhutani City Center\, Sector 32;Noida;Uttar Pradesh;201301;India",
    `URL:${SITE}/${c.slug}`,
    "NOTE:NEET UG & PG counselling for MBBS\, BDS and MD/MS. Office Mon-Sat 10 AM-7 PM.",
    "END:VCARD", "",
  ].join("\r\n");
  fs.writeFileSync(`public/card/${c.slug}.vcf`, vcf);
}

// 1200x630 JPEG previews (WhatsApp does not render AVIF — see lib/ogImage.ts).
(async () => {
  const W = 1200, H = 630;
  const logo = await sharp("public/assets/images/logos/logo-4k.avif").resize({ width: 300 }).png().toBuffer();
  const mark = await sharp("public/icon-512.png").resize({ width: 210 }).png().toBuffer();
  // A photo, where there is one, replaces the shield: a round crop with a mint ring.
  const portrait = async (file) => {
    const D = 250;
    const ring = Buffer.from(`<svg width="${D + 16}" height="${D + 16}"><circle cx="${D / 2 + 8}" cy="${D / 2 + 8}" r="${D / 2 + 6}" fill="#14E6A8"/></svg>`);
    const mask = Buffer.from(`<svg width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="#fff"/></svg>`);
    const round = await sharp(`public/card/${file}`).resize(D, D).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
    return sharp(ring).composite([{ input: round, left: 8, top: 8 }]).png().toBuffer();
  };
  for (const c of COUNSELLORS) {
    const side = c.photo ? { input: await portrait(c.photo), left: W - 330, top: 170 } : { input: mark, left: W - 290, top: 190 };
    const org = c.org || "";
    const titleLine = org
      ? `<text x="72" y="400" font-size="32" font-weight="600" fill="#FFFFFF">${esc(c.title)}</text>
    <text x="72" y="442" font-size="26" font-weight="500" fill="#CFE0EE">${esc(org)}</text>`
      : `<text x="72" y="408" font-size="34" font-weight="500" fill="#CFE0EE">${esc(c.title)} · AdmissionHands</text>`;
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
    <text x="68" y="350" font-size="88" font-weight="800" fill="#FFFFFF" letter-spacing="-2">${esc(c.name)}</text>
    ${titleLine}
    <g font-size="25" font-weight="700" fill="#E8F2FA">
      <rect x="72" y="460" width="196" height="54" rx="27" fill="#FFFFFF" fill-opacity="0.1" stroke="#FFFFFF" stroke-opacity="0.25"/>
      <text x="170" y="495" text-anchor="middle">MBBS &amp; BDS</text>
      <rect x="284" y="460" width="262" height="54" rx="27" fill="#FFFFFF" fill-opacity="0.1" stroke="#FFFFFF" stroke-opacity="0.25"/>
      <text x="415" y="495" text-anchor="middle">MD / MS · NEET PG</text>
      <rect x="562" y="460" width="190" height="54" rx="27" fill="#FFFFFF" fill-opacity="0.1" stroke="#FFFFFF" stroke-opacity="0.25"/>
      <text x="657" y="495" text-anchor="middle">NRI quota</text>
    </g>
    <text x="72" y="570" font-size="25" font-weight="500" fill="#9FB8CD">Noida office · WhatsApp ${pretty(c.phone)}</text>
  </g>
</svg>`;
    await sharp(Buffer.from(svg))
      .composite([{ input: logo, left: 84, top: 66 }, side])
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(`public/card/${c.slug}-og.jpg`);
    console.log(`${SITE}/${c.slug}`);
  }
})();
