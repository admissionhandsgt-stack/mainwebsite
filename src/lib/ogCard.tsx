import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * A page's own share image, 1200×630 (2026-11-11, owner: "Google Discover + images ka kardo"). Every state, counselling
 * and college page used to share one generic card; now each draws its own figures — what Discover, Google Images and a
 * WhatsApp unfurl show. Light, the brand's teal, the shield, the page's facts; never a college's closing rank (a
 * college card may carry its public band, as its page does). Used by the routes' opengraph-image.tsx files.
 *
 * Inter is read from public/fonts/og (TTF — the renderer reads TTF, not woff2); if that fails the bundled Noto Sans is
 * used, and the rupee sign is written "Rs" so nothing renders as a box.
 */

export const OG_SIZE = { width: 1200, height: 630 };

let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" }[]> | null = null;
/** Inter (OFL), two static weights in public/fonts/og — read from disk, so no font is fetched while a card renders. */
function loadFonts() {
  if (!fonts) {
    fonts = Promise.all(
      // The latin subset has no rupee sign; a one-glyph file (Inter's own ₹) is the fallback face for it.
      ([["Inter-Regular.ttf", 400, "Inter"], ["Inter-ExtraBold.ttf", 800, "Inter"], ["Inter-ExtraBold-rupee.ttf", 800, "InterRupee"]] as const).map(async ([file, weight, name]) => {
        const b = await readFile(join(process.cwd(), "public", "fonts", "og", file));
        return { name, data: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, weight, style: "normal" as const };
      }),
    ).catch(() => {
      fonts = null;
      return [];
    });
  }
  return fonts;
}

let logo: Promise<string | null> | null = null;
const loadLogo = () =>
  (logo ??= readFile(join(process.cwd(), "public", "icon-192.png"))
    .then((b) => `data:image/png;base64,${b.toString("base64")}`)
    .catch(() => null));

export interface OgStat {
  value: string;
  label: string;
}

export async function ogCard(opts: { eyebrow: string; title: string; subtitle?: string; stats: OgStat[]; badge?: string }) {
  const [f, icon] = await Promise.all([loadFonts(), loadLogo()]);
  // "≈" is not in the font's latin subset; "~" is. Without Inter, the rupee sign becomes "Rs".
  const rupee = (s: string) => (f.length ? s : s.replace(/₹/g, "Rs ")).replace(/≈\s*/g, "~");
  const stats = opts.stats.filter((s) => s.value && s.value !== "—").slice(0, 4);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #ecfeff 0%, #ffffff 55%, #ecfdf5 100%)",
          // Only when Inter loaded: an undefined fontFamily makes the renderer fail ("reading 'split'").
          ...(f.length ? { fontFamily: "Inter, InterRupee" } : {}),
          color: "#0f172a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {icon && <img src={icon} width={56} height={56} alt="" />}
            <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: "#0e7490" }}>AdmissionHands</div>
          </div>
          {opts.badge && (
            <div style={{ display: "flex", fontSize: 24, fontWeight: 800, color: "#ffffff", background: "#0e7490", borderRadius: 999, padding: "10px 22px" }}>
              {rupee(opts.badge)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#0e7490" }}>{opts.eyebrow}</div>
          <div style={{ display: "flex", fontSize: opts.title.length > 48 ? 54 : 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>{rupee(opts.title)}</div>
          {opts.subtitle && <div style={{ display: "flex", fontSize: 28, color: "#475569" }}>{rupee(opts.subtitle)}</div>}
        </div>

        <div style={{ display: "flex", gap: 18 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{ display: "flex", flexDirection: "column", flex: 1, background: "#ffffff", border: "2px solid #cffafe", borderRadius: 24, padding: "20px 24px" }}
            >
              <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#0e7490" }}>{rupee(s.value)}</div>
              <div style={{ display: "flex", fontSize: 22, color: "#475569" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "#64748b" }}>
          <div style={{ display: "flex" }}>www.admissionhands.com · Expert MBBS & NEET PG counselling</div>
          <div style={{ display: "flex" }}>Sources: NMC, MCC, official notices</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: f.length ? f : undefined, headers: { "cache-control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}

/** "₹94,351" / "6,415" helpers for the cards. */
export const ogNum = (v: number | null | undefined) => (v == null ? "" : v.toLocaleString("en-IN"));
export const ogMoney = (v: number | null | undefined) =>
  v == null ? "" : v >= 10_000_000 ? `₹${(v / 10_000_000).toFixed(2)} Cr` : v >= 100_000 ? `₹${(v / 100_000).toFixed(1)} L` : `₹${v.toLocaleString("en-IN")}`;
