/**
 * Does sharp decode AVIF correctly on this machine? Run by deploy_oracle.sh
 * inside the release, on the server's own CPU, before the release goes live.
 *
 *   node check_sharp_decode.cjs <file.avif> [more.avif ...]
 *
 * sharp 0.34.x on linux-arm64 (libaom 3.12+) decodes AVIF with bright-green
 * blocks through the picture. The same version on x86 is fine, and 0.33.5
 * (libaom 3.9.1) is fine on both — so it is the ARM build, not the files. On
 * the Oracle server it hit 39 of the 42 AVIF uploads: every hero and college
 * photograph went out through /_next/image with green patches from the
 * 2026-10-04 move until 10-06, and no check noticed, because a corrupt image
 * is still a 200 with the right content type.
 *
 * The test is crude on purpose: count opaque pixels that are vivid green (G
 * well above both R and B). Our photographs have a few hundred at most — a
 * lawn, a sign. A broken decoder produces hundreds of thousands.
 */
// From the release (the working directory), not from wherever this file sits:
// the point is to test the sharp that release will actually run.
const sharp = require(require.resolve("sharp", { paths: [process.cwd()] }));

const LIMIT = 5000;

(async () => {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("usage: check_sharp_decode.cjs <file.avif> ...");
    process.exit(2);
  }
  let bad = 0;
  for (const file of files) {
    const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let green = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (data[i + 3] > 200 && g > 150 && g > r * 1.6 && g > b * 1.6) green++;
    }
    const ok = green < LIMIT;
    if (!ok) bad++;
    console.log(`  ${ok ? "ok " : "BAD"} ${file.split("/").pop()}: ${green} vivid-green pixels`);
  }
  console.log(`  sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}, aom ${sharp.versions.aom || "-"}, ${process.arch}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
