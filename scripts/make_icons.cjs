// Square site icons cut from the shield in the logo.
//
// The only icon used to be public/logo.png — the 1088x367 wordmark — declared
// as a 32x32 and a 180x180 icon, and favicon.ico was the same PNG renamed.
// Google shows a site's favicon beside every search result and needs a square
// one (a multiple of 48px) to use it at all; a wide wordmark squeezed into a
// square is unreadable at 16px. Run: node scripts/make_icons.cjs
const fs = require('fs');
const sharp = require('sharp');
(async () => {
  const full = await sharp('public/assets/images/logos/logo-4k.avif').png().toBuffer();
  const shield = await sharp(full)
    .extract({ left: 0, top: 0, width: 1180, height: 1295 })
    .png()
    .toBuffer()
    // sharp trims before it extracts within one pipeline, so trim in a second.
    .then((b) => sharp(b).trim().png().toBuffer());
  const m = await sharp(shield).metadata();
  const side = Math.round(Math.max(m.width, m.height) * 1.08);
  const square = await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: shield, gravity: 'center' }])
    .png()
    .toBuffer();
  const out = [
    ['public/icon-48.png', 48],
    ['public/icon-192.png', 192],
    ['public/icon-512.png', 512],
  ];
  for (const [file, size] of out) await sharp(square).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  // Apple draws its own rounded mask over the whole square and fills
  // transparency with black, so the touch icon gets a white ground.
  await sharp(square).resize(150, 150).extend({ top: 15, bottom: 15, left: 15, right: 15, background: '#ffffff' })
    .flatten({ background: '#ffffff' }).png().toFile('public/apple-touch-icon.png');
  // favicon.ico: an ICO container holding 16, 32 and 48px PNGs. Browsers and
  // crawlers that ask for /favicon.ico by name get a real icon, not a wide PNG.
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(sizes.map((n) => sharp(square).resize(n, n).png().toBuffer()));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((n, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(n, e); header.writeUInt8(n, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(pngs[i].length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += pngs[i].length;
  });
  fs.writeFileSync('public/favicon.ico', Buffer.concat([header, ...pngs]));
  console.log('icons from a', m.width, 'x', m.height, 'shield');
})();
