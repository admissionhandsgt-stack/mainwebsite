import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { addOutreach, type Kind } from "@/lib/outreach";
import { findNewSites } from "@/lib/hunt";

/**
 * Finding who to write to (2026-11-10; owner: "email dhunde unko target karke email bheje automatic ye manually add na krna
 * pade"). Weekly (`POST /api/cron/outreach-discover`, Tuesdays 05:50 UTC) for every site in `outreach_sources` not read in
 * the last 30 days: its home page, then up to four of its own contact / about / team / editorial pages, robots.txt
 * respected. An address the organisation published there — preferring editorial, news, info, contact, office, secretary —
 * becomes a draft in the outreach list (lib/outreach.ts) with where it was found. At most two per site. Nothing is sent
 * from here: every draft still waits for the owner's Send on Telegram.
 *
 * Never: an address from another site, a role address that is not for this (privacy, grievance, careers, sales,
 * advertising, no-reply…), or more than one look a month at a site.
 *
 * Server only.
 */
const UA = "AdmissionHands-outreach/1.0 (+https://www.admissionhands.com; contact page reader, monthly)";
const SKIP = /^(no-?reply|donotreply|privacy|abuse|dpo|grievance|legal|careers?|jobs|hr|recruit|ads|advertis|marketing|sales|billing|accounts?|unsubscribe|webmaster|postmaster|subscriptions?|circulation)\b/i;
const PREFER = /^(editorial|editor|news|newsdesk|desk|info|contact|office|secretary|president|admin|hello|team)\b/i;
const NOT_REAL = /\.(png|jpe?g|gif|webp|svg)$|example\.|sentry|wixpress|godaddy|domain\.com|email\.com|yourmail/i;

export type Source = { id: number; url: string; org: string; kind: Kind; last_crawled_at: string | null; found: number; last_note: string | null };

async function get(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,text/plain" }, redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!r.ok) return null;
    const text = await r.text();
    return text.slice(0, 1_500_000);
  } catch {
    return null;
  }
}

/** robots.txt for user-agent * (and ours): the Disallow prefixes. */
async function disallowed(origin: string): Promise<string[]> {
  const txt = (await get(`${origin}/robots.txt`)) ?? "";
  const out: string[] = [];
  let applies = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^(user-agent|disallow)\s*:\s*(.*)$/i);
    if (!m) continue;
    if (m[1].toLowerCase() === "user-agent") applies = m[2] === "*" || /admissionhands/i.test(m[2]);
    else if (applies && m[2]) out.push(m[2]);
  }
  return out;
}

function emailsIn(html: string): string[] {
  const text = html
    .replace(/&#64;|&#x40;/gi, "@")
    .replace(/\s*(\[at\]|\(at\)|\{at\})\s*/gi, "@")
    .replace(/\s*(\[dot\]|\(dot\))\s*/gi, ".");
  const found = new Set<string>();
  for (const m of text.matchAll(/(?:mailto:)?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi)) {
    const e = m[1].toLowerCase().replace(/\.$/, "");
    if (!NOT_REAL.test(e)) found.add(e);
  }
  return [...found];
}

export async function discoverOne(s: Source): Promise<{ added: string[]; note: string }> {
  let origin: URL;
  try {
    origin = new URL(s.url);
    if (origin.protocol !== "https:") return { added: [], note: "not https" };
  } catch {
    return { added: [], note: "bad address" };
  }
  const blocked = await disallowed(origin.origin);
  const allowed = (path: string) => !blocked.some((p) => p !== "/" ? path.startsWith(p) : true);
  const home = allowed("/") ? await get(origin.origin + "/") : null;
  if (home === null) return { added: [], note: "home page not readable (or robots.txt says no)" };

  // Its own contact-like pages, from the home page's links, plus the usual addresses.
  const links = new Set<string>(["/contact", "/contact-us", "/about", "/about-us"]);
  for (const m of home.matchAll(/href="([^"#]+)"[^>]*>([^<]{0,60})</gi)) {
    if (!/contact|about|team|editorial|reach|press|write to us/i.test(`${m[1]} ${m[2]}`)) continue;
    try {
      const u = new URL(m[1], origin);
      // Never a feed or a file: Express Healthcare's /feed/ gave a writer's own Gmail (2026-11-10), not the site's contact.
      if (u.hostname === origin.hostname && !/\/(feed|rss)\b|\.(xml|json|pdf)$/i.test(u.pathname)) links.add(u.pathname);
    } catch {
      /* not a link */
    }
  }
  const pages: { path: string; html: string }[] = [{ path: "/", html: home }];
  for (const p of [...links].slice(0, 8)) {
    if (pages.length >= 5 || !allowed(p)) continue;
    const html = await get(origin.origin + p);
    if (html) pages.push({ path: p, html });
  }

  // The organisation's own domain (www. and subdomains count); a free-mail address only when the site itself prints it.
  const domain = origin.hostname.replace(/^www\./, "");
  const candidates = new Map<string, string>();
  for (const pg of pages) for (const e of emailsIn(pg.html)) if (!candidates.has(e)) candidates.set(e, pg.path);
  // A free-mail address only from the site's own contact / about / team page, where it is the organisation's published
  // address — not one that turns up elsewhere on the site (an author's, a commenter's).
  const contactPage = (path: string) => /contact|about|team|reach|write/i.test(path);
  const picked = [...candidates.entries()]
    .filter(
      ([e, path]) =>
        !SKIP.test(e.split("@")[0]) &&
        (e.endsWith(`@${domain}`) || e.endsWith(`.${domain}`) || (/@(gmail|yahoo|outlook|rediffmail)\./.test(e) && contactPage(path))),
    )
    .sort((a, b) => Number(PREFER.test(b[0].split("@")[0])) - Number(PREFER.test(a[0].split("@")[0])))
    .slice(0, 2);

  const added: string[] = [];
  for (const [email, path] of picked) {
    try {
      await addOutreach({ email, org: s.org, kind: s.kind, why: `Published on ${origin.hostname}${path}`, sourceUrl: origin.origin + path });
      added.push(email);
    } catch {
      /* already on the list, or not an address */
    }
  }
  return { added, note: added.length ? `added ${added.join(", ")}` : picked.length ? "already on the list" : `no suitable address on ${pages.length} pages` };
}

export async function runDiscover(opts: { force?: boolean } = {}): Promise<{ sites: number; added: number; newSites: number }> {
  // New sites first (Tavily, a few a week), so this week's reading already includes them.
  const fresh = await findNewSites().catch(() => ({ added: 0 }));
  const due = (await db.execute(sql`
    SELECT id, url, org, kind, to_json(last_crawled_at)#>>'{}' AS last_crawled_at, found, last_note FROM outreach_sources
     WHERE ${opts.force ? sql`true` : sql`last_crawled_at IS NULL OR last_crawled_at < now() - interval '30 days'`}
     ORDER BY last_crawled_at NULLS FIRST LIMIT 25`)) as unknown as Source[];
  let added = 0;
  for (const s of due) {
    const r = await discoverOne(s);
    added += r.added.length;
    await db.execute(sql`UPDATE outreach_sources SET last_crawled_at = now(), found = found + ${r.added.length}, last_note = ${r.note.slice(0, 300)} WHERE id = ${s.id}`);
  }
  return { sites: due.length, added, newSites: fresh.added };
}

export async function listSources(): Promise<Source[]> {
  return (await db.execute(sql`
    SELECT id, url, org, kind, to_json(last_crawled_at)#>>'{}' AS last_crawled_at, found, last_note FROM outreach_sources ORDER BY created_at DESC`)) as unknown as Source[];
}

export async function addSource(url: string, org: string, kind: Kind) {
  const u = new URL(url.trim());
  if (u.protocol !== "https:") throw new Error("Use the site's https:// address.");
  const o = org.trim().slice(0, 160);
  if (!o) throw new Error("Say which organisation it is.");
  await db.execute(sql`INSERT INTO outreach_sources (url, org, kind) VALUES (${u.origin}, ${o}, ${kind}) ON CONFLICT ((lower(url))) DO NOTHING`);
}

export async function deleteSource(id: number) {
  await db.execute(sql`DELETE FROM outreach_sources WHERE id = ${id}`);
}
