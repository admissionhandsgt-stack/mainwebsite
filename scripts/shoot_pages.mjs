#!/usr/bin/env node
/**
 * Photograph the pages, so somebody can look at them.
 *
 *   node scripts/shoot_pages.mjs http://localhost:3000
 *   node scripts/shoot_pages.mjs http://localhost:3000 /mbbs-india /nri-quota
 *
 * `audit_site.mjs` checks what can be asserted — headings, tap targets, broken
 * links, console errors. It cannot tell you that a hero is now mostly storm sky,
 * or that a credit line is sitting on top of a headline, and both of those
 * happened in this pass. This writes one PNG per route into the scratch
 * directory and a contact sheet beside them.
 *
 * Shots are full-page at 1440 and the top fold at 390, because the two failures
 * that matter look different: a bad crop shows at desktop width and an
 * overlapping credit shows on a phone.
 */

import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const ROUTES = process.argv.slice(3).length
  ? process.argv.slice(3)
  : [
      "/",
      "/mbbs-india",
      "/mbbs-india/colleges",
      "/mbbs-india/deemed-universities",
      "/md-ms-india",
      "/md-ms-india/colleges",
      "/nri-quota",
      "/nri-quota/colleges",
      "/neet-ug-process",
      "/neet-pg-process",
      "/services",
      "/know-us",
      "/login",
    ];

// A phone is where an overlap shows: the services credit sat behind a stats
// card that only overlaps at desktop width, and a long credit line wraps on a
// narrow screen. WIDTH=390 shoots the same routes at phone size.
const WIDTH = Number(process.env.WIDTH) || 1440;
const HEIGHT = WIDTH < 600 ? 844 : 900;

const OUT = `C:/Users/91971/AppData/Local/Temp/shots${WIDTH < 600 ? "-390" : ""}`;
mkdirSync(OUT, { recursive: true });

const name = (route) => (route === "/" ? "home" : route.slice(1).replace(/\//g, "_"));

const browser = await chromium.launch();
const shots = [];

try {
  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    try {
      // `networkidle` never settles on a page with a marquee and an analytics
      // beacon — it timed out and reported 22 working pages as broken when the
      // audit harness first used it. Wait for load, then settle for a beat.
      await page.goto(BASE + route, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(2500);
      const file = join(OUT, `${name(route)}.png`);
      await page.screenshot({ path: file });
      shots.push({ route, file });
      console.log(`  OK    ${route}`);
    } catch (err) {
      console.log(`  FAIL  ${route.padEnd(34)}${err.message.split("\n")[0]}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (shots.length) {
  const W = 480, H = Math.round((480 * HEIGHT) / WIDTH), cols = 3;
  const tiles = [];
  for (const s of shots) {
    tiles.push(await sharp(s.file).resize(W, H, { fit: "cover", position: "top" }).toBuffer());
  }
  await sharp({
    create: { width: W * cols, height: H * Math.ceil(tiles.length / cols), channels: 3, background: "#fff" },
  })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * W, top: Math.floor(i / cols) * H })))
    .png()
    .toFile(join(OUT, "contact-sheet.png"));
  console.log(`\n${shots.length} shots in ${OUT}`);
  shots.forEach((s, i) => console.log(`  ${i + 1}. ${s.route}`));
}
