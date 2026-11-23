/**
 * What a page says, reduced to one hash (2026-11-18, owner: "agar ek word bhi change hota hai page par to wo recrawl ho…
 * bot add kar raha hai kuch bhi tb bhi har ek detail updated chaiye google + bing ko … perfect timing ke sath").
 * lib/pageWatch.ts renders each sitemap page, hashes it with this, and when the hash moves records the moment it changed:
 * the page's sitemap lastmod, its "Updated … IST" line and its JSON-LD dateModified all take that time, and IndexNow
 * and Google are told.
 *
 * Only the page's own content counts: what a search result shows of it (title, meta description, robots rule,
 * canonical) and the inside of <main> — every word a reader sees, every link, every image's alt text — and nothing
 * outside it (header, alerts bar, footer, nudges: site furniture that changes on every page at once and is not a change
 * to any one page). Left out inside <main>: scripts and styles (the RSC payload, JSON-LD — which carries the
 * dateModified this very hash sets, so counting it would move the page on every check), comments, attributes other than
 * links, and any element marked `data-nohash` — the "Updated …" time itself and the "More on…" block that rotates by
 * week. Import-free so a script can use it too.
 */
import { createHash } from "node:crypto";

/** Cut out every element whose opening tag carries `data-nohash`, with everything inside it. */
function dropMarked(html: string): string {
  // React escapes ">" inside attribute values, so "[^>]*" cannot run past the end of a tag.
  const open = /<([a-zA-Z][\w-]*)\b[^>]*?\sdata-nohash\b[^>]*>/;
  let out = html;
  for (let guard = 0; guard < 200; guard++) {
    const m = open.exec(out);
    if (!m) break;
    const tag = m[1].toLowerCase();
    const start = m.index;
    let i = start + m[0].length;
    if (m[0].endsWith("/>")) {
      out = out.slice(0, start) + out.slice(i);
      continue;
    }
    const tok = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
    tok.lastIndex = i;
    let depth = 1;
    let end = out.length;
    for (let t = tok.exec(out); t; t = tok.exec(out)) {
      if (t[0].endsWith("/>")) continue;
      depth += t[1] ? -1 : 1;
      if (depth === 0) {
        end = t.index + t[0].length;
        break;
      }
    }
    out = out.slice(0, start) + out.slice(end);
  }
  return out;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#x27": "'" };

function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (all, e: string) => {
    const k = e.toLowerCase();
    if (ENTITIES[k]) return ENTITIES[k];
    if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
    if (k.startsWith("#")) return String.fromCodePoint(Number(k.slice(1)));
    return all;
  });
}

export interface Fingerprint {
  hash: string;
  /** Characters of visible text — a page with almost none (an error shell) is never recorded as a change. */
  chars: number;
  links: number;
  /** The text itself, for a diff when a change needs explaining. */
  text: string;
  /** The other three things the hash covers, for the same purpose: the <head> snippet, every link, every alt text. */
  snippet: string;
  hrefs: string[];
  alts: string[];
}

/** The hash of a rendered page's own content, or null when the HTML has no <main>. */
export function fingerprint(html: string): Fingerprint | null {
  const a = html.indexOf("<main");
  const b = html.lastIndexOf("</main>");
  if (a < 0 || b < a) return null;
  let body = html.slice(a, b);
  body = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<template\b[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "");
  body = dropMarked(body);
  const links = [...body.matchAll(/\shref="([^"]*)"/g)].map((m) => decode(m[1]).replace(/^https:\/\/www\.admissionhands\.com/, ""));
  const alts = [...body.matchAll(/\salt="([^"]*)"/g)].map((m) => decode(m[1]));
  const text = decode(body.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  // What a search result shows of the page, from <head>: its title, description, robots rule and canonical.
  const head = html.slice(0, a);
  const meta = (name: string) => decode(head.match(new RegExp(`<meta[^>]+name="${name}"[^>]*content="([^"]*)"`, "i"))?.[1] ?? "");
  const snippet = [
    decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
    meta("description"),
    meta("robots"),
    head.match(/<link[^>]+rel="canonical"[^>]*href="([^"]*)"/i)?.[1] ?? "",
  ].join("\n");
  const hash = createHash("sha256")
    .update(snippet)
    .update("\n\u0000main\n")
    .update(text)
    .update("\n\u0000links\n")
    .update(links.join("\n"))
    .update("\n\u0000alt\n")
    .update(alts.join("\n"))
    .digest("hex");
  return { hash, chars: text.length, links: links.length, text, snippet, hrefs: links, alts };
}
