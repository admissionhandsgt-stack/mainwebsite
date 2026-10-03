/**
 * Content reads for the marketing site.
 *
 * Replaces the Supabase client for everything a visitor sees. Each function
 * returns a safe empty value when the database is unreachable rather than
 * throwing, so a database blip degrades one section instead of 500-ing the
 * whole page — the behaviour the Supabase code had, kept deliberately.
 */

import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

const rows = <T,>(r: unknown) => r as unknown as T[];

async function safe<T>(run: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[content:${label}]`, error instanceof Error ? error.message : error);
    return fallback;
  }
}

/* ----------------------------- contact ----------------------------- */

export interface ContactInfo {
  phoneNumber: string | null;
  whatsappNumber: string | null;
  email: string | null;
  leadNotificationPhone: string | null;
}

export async function getContactInfo(): Promise<ContactInfo | null> {
  return safe(
    async () => {
      const r = rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT phone_number, whatsapp_number, email, lead_notification_phone
          FROM contact_info ORDER BY id LIMIT 1
        `),
      )[0];
      if (!r) return null;
      return {
        phoneNumber: (r.phone_number as string) ?? null,
        whatsappNumber: (r.whatsapp_number as string) ?? null,
        email: (r.email as string) ?? null,
        leadNotificationPhone: (r.lead_notification_phone as string) ?? null,
      };
    },
    null,
    "contact",
  );
}

/* ------------------------------ alerts ----------------------------- */

export interface LiveAlert {
  id: number;
  title: string;
  link: string | null;
  imageUrl: string | null;
}

export async function getLiveAlerts(): Promise<LiveAlert[]> {
  return safe(
    async () =>
      rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT id, title, link, image_url FROM live_alerts
          WHERE is_active = true ORDER BY order_index ASC, id ASC
        `),
      ).map((r) => ({
        id: r.id as number,
        title: r.title as string,
        link: (r.link as string) ?? null,
        imageUrl: (r.image_url as string) ?? null,
      })),
    [],
    "alerts",
  );
}

/* ------------------------------ videos ----------------------------- */

export interface VideoRecord {
  id: number;
  title: string;
  videoId: string;
  description: string | null;
  featured: boolean;
}

export async function getVideos(limit?: number): Promise<VideoRecord[]> {
  return safe(
    async () =>
      rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT id, title, videos_id, description, featured FROM videos
          ORDER BY featured DESC, created_at DESC
          ${limit ? sql`LIMIT ${limit}` : sql``}
        `),
      ).map((r) => ({
        id: r.id as number,
        title: r.title as string,
        videoId: r.videos_id as string,
        description: (r.description as string) ?? null,
        featured: Boolean(r.featured),
      })),
    [],
    "videos",
  );
}

/* --------------------------- media assets -------------------------- */

export interface MediaAsset {
  mediaKey: string;
  title: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  altText: string | null;
  isActive: boolean;
  /**
   * snake_case aliases of the same values. The page components were written
   * against the Supabase row shape; carrying both spellings means the
   * migration did not need to touch nine page files to rename a field.
   */
  image_url: string;
  mobile_image_url: string | null;
  alt_text: string | null;
  media_key: string;
}

export async function getMediaAsset(mediaKey: string): Promise<MediaAsset | null> {
  return safe(
    async () => {
      const r = rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT media_key, title, image_url, mobile_image_url, alt_text, is_active
          FROM media_assets WHERE media_key = ${mediaKey} LIMIT 1
        `),
      )[0];
      if (!r) return null;
      // An inactive row means "deliberately hidden" — the UI reads 'none' as
      // "render nothing" rather than falling back to a default image.
      const active = Boolean(r.is_active);
      const imageUrl = active ? (r.image_url as string) : "none";
      const mobileImageUrl = active ? ((r.mobile_image_url as string) ?? null) : "none";
      const altText = (r.alt_text as string) ?? null;
      const key = r.media_key as string;
      return {
        mediaKey: key,
        title: (r.title as string) ?? null,
        imageUrl,
        mobileImageUrl,
        altText,
        isActive: active,
        media_key: key,
        image_url: imageUrl,
        mobile_image_url: mobileImageUrl,
        alt_text: altText,
      };
    },
    null,
    "media",
  );
}

export async function getMediaAssets(sectionType?: string): Promise<MediaAsset[]> {
  return safe(
    async () =>
      rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT media_key, title, image_url, mobile_image_url, alt_text, is_active
          FROM media_assets
          WHERE is_active = true ${sectionType ? sql`AND section_type = ${sectionType}` : sql``}
          ORDER BY display_order ASC, id ASC
        `),
      ).map((r) => ({
        mediaKey: r.media_key as string,
        title: (r.title as string) ?? null,
        imageUrl: r.image_url as string,
        mobileImageUrl: (r.mobile_image_url as string) ?? null,
        altText: (r.alt_text as string) ?? null,
        isActive: true,
        media_key: r.media_key as string,
        image_url: r.image_url as string,
        mobile_image_url: (r.mobile_image_url as string) ?? null,
        alt_text: (r.alt_text as string) ?? null,
      })),
    [],
    "mediaList",
  );
}

/* -------------------------- legal documents ------------------------ */

export interface LegalDocument {
  slug: string;
  title: string;
  content: string;
  lastUpdated: string | null;
}

export async function getLegalDocuments(): Promise<LegalDocument[]> {
  return safe(
    async () =>
      rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT slug, title, content, last_updated FROM legal_documents
          WHERE is_published = true ORDER BY created_at ASC
        `),
      ).map((r) => ({
        slug: r.slug as string,
        title: r.title as string,
        content: (r.content as string) ?? "",
        lastUpdated: r.last_updated ? new Date(r.last_updated as string).toISOString() : null,
      })),
    [],
    "legalList",
  );
}

export async function getLegalDocument(slug: string): Promise<LegalDocument | null> {
  return safe(
    async () => {
      const r = rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT slug, title, content, last_updated FROM legal_documents
          WHERE slug = ${slug} AND is_published = true LIMIT 1
        `),
      )[0];
      if (!r) return null;
      return {
        slug: r.slug as string,
        title: r.title as string,
        content: (r.content as string) ?? "",
        lastUpdated: r.last_updated ? new Date(r.last_updated as string).toISOString() : null,
      };
    },
    null,
    "legal",
  );
}

/* --------------------------- mbbs states --------------------------- */

export interface MbbsState {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  collegesCount: number | null;
  content: string | null;
}

export async function getMbbsStates(): Promise<MbbsState[]> {
  return safe(
    async () =>
      rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT id, name, slug, image_url, colleges_count, content FROM mbbs_states
          WHERE is_active = true ORDER BY name ASC
        `),
      ).map((r) => ({
        id: r.id as number,
        name: r.name as string,
        slug: r.slug as string,
        imageUrl: (r.image_url as string) ?? null,
        collegesCount: (r.colleges_count as number) ?? null,
        content: (r.content as string) ?? null,
      })),
    [],
    "states",
  );
}

export async function getMbbsState(slug: string): Promise<MbbsState | null> {
  const all = await getMbbsStates();
  return all.find((s) => s.slug === slug) ?? null;
}

/* ------------------------- curated colleges ------------------------ */

export interface CuratedCollege {
  id: number;
  slug: string;
  collegeName: string;
  collegeType: string | null;
  state: string | null;
  city: string | null;
  universityName: string | null;
  establishedYear: number | null;
  intake: number | null;
  nriSeats: number | null;
  hasNriSeats: boolean;
  isWomenOnly: boolean;
  imageUrl: string | null;
  displayOrder: number;
}

const CURATED_TABLES = {
  ugAll: sql`ug_all_colleges`,
  ugRecommended: sql`ug_recommended_colleges`,
  deemed: sql`deemed_colleges`,
} as const;

export async function getCuratedColleges(
  which: keyof typeof CURATED_TABLES,
): Promise<CuratedCollege[]> {
  return safe(
    async () =>
      rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT id, slug, college_name, college_type, state, city, university_name,
                 established_year, intake, nri_seats, has_nri_seats, is_women_only,
                 image_url, display_order
          FROM ${CURATED_TABLES[which]}
          WHERE is_active = true
          ORDER BY display_order ASC, college_name ASC
        `),
      ).map((r) => ({
        id: r.id as number,
        slug: r.slug as string,
        collegeName: r.college_name as string,
        collegeType: (r.college_type as string) ?? null,
        state: (r.state as string) ?? null,
        city: (r.city as string) ?? null,
        universityName: (r.university_name as string) ?? null,
        establishedYear: (r.established_year as number) ?? null,
        intake: (r.intake as number) ?? null,
        nriSeats: (r.nri_seats as number) ?? null,
        hasNriSeats: Boolean(r.has_nri_seats),
        isWomenOnly: Boolean(r.is_women_only),
        imageUrl: (r.image_url as string) ?? null,
        displayOrder: (r.display_order as number) ?? 0,
      })),
    [],
    `curated:${which}`,
  );
}

/** Homepage grouping used by the recommended-colleges section. */
export type GroupedColleges = {
  Govt: CuratedCollege[];
  Private: CuratedCollege[];
  Deemed: CuratedCollege[];
};

export async function getRecommendedCollegesGrouped(): Promise<GroupedColleges> {
  const list = await getCuratedColleges("ugRecommended");
  const grouped: GroupedColleges = { Govt: [], Private: [], Deemed: [] };
  for (const c of list) {
    const t = (c.collegeType ?? "").toLowerCase();
    if (t === "government" || t === "govt") grouped.Govt.push(c);
    else if (t === "private") grouped.Private.push(c);
    else if (t === "deemed") grouped.Deemed.push(c);
  }
  return grouped;
}

/* ---------------------------- pg content --------------------------- */

export interface PgBranch {
  id: number;
  branchName: string;
  shortDescription: string | null;
  iconUrl: string | null;
  category: string | null;
}

export async function getPgBranches(): Promise<PgBranch[]> {
  return safe(
    async () =>
      rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT id, branch_name, short_description, icon_url, category
          FROM pg_branches WHERE is_active = true
          ORDER BY display_order ASC, branch_name ASC
        `),
      ).map((r) => ({
        id: r.id as number,
        branchName: r.branch_name as string,
        shortDescription: (r.short_description as string) ?? null,
        iconUrl: (r.icon_url as string) ?? null,
        category: (r.category as string) ?? null,
      })),
    [],
    "pgBranches",
  );
}

export interface PgCollegeContent {
  id: number;
  collegeName: string;
  city: string | null;
  state: string | null;
  collegeType: string | null;
  ownership: string | null;
  yearEstablished: number | null;
  totalPgSeats: number | null;
  keySpecialties: string[];
  shortDescription: string | null;
  imageUrl: string | null;
  /** Who took the photograph. CC BY and CC BY-SA require it to be shown. */
  imageAttribution: string | null;
  imageLicense: string | null;
}

export async function getPgCollegesContent(): Promise<PgCollegeContent[]> {
  return safe(
    async () =>
      rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT id, college_name, city, state, college_type, ownership, year_established,
                 total_pg_seats, key_specialties, short_description, image_url,
                 image_attribution, image_license
          FROM pg_colleges_content WHERE is_active = true
          ORDER BY display_order ASC, college_name ASC
        `),
      ).map((r) => {
        let specialties: string[] = [];
        try {
          const parsed = r.key_specialties ? JSON.parse(r.key_specialties as string) : [];
          if (Array.isArray(parsed)) specialties = parsed.map(String);
        } catch {
          specialties = [];
        }
        return {
          id: r.id as number,
          collegeName: r.college_name as string,
          city: (r.city as string) ?? null,
          state: (r.state as string) ?? null,
          collegeType: (r.college_type as string) ?? null,
          ownership: (r.ownership as string) ?? null,
          yearEstablished: (r.year_established as number) ?? null,
          totalPgSeats: (r.total_pg_seats as number) ?? null,
          keySpecialties: specialties,
          shortDescription: (r.short_description as string) ?? null,
          imageUrl: (r.image_url as string) ?? null,
          imageAttribution: (r.image_attribution as string) ?? null,
          imageLicense: (r.image_license as string) ?? null,
        };
      }),
    [],
    "pgContent",
  );
}

/* ------------------------------------------------------------------ *
 * Configurable content — settings and collections
 * ------------------------------------------------------------------ */

export interface ContentBlock {
  id: number;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  icon: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  data: Record<string, unknown>;
  displayOrder: number;
}

/**
 * Every setting, as a plain key/value map.
 *
 * Read once per render and passed down, rather than a query per field —
 * a page that shows twenty settings should not make twenty round trips.
 */
export async function getSettings(): Promise<Record<string, string>> {
  return safe(
    async () => {
      const out: Record<string, string> = {};
      for (const r of rows<{ key: string; value: string | null }>(
        await db.execute(sql`SELECT key, value FROM site_settings`),
      )) {
        out[r.key] = r.value ?? "";
      }
      return out;
    },
    {},
    "settings",
  );
}

/** Reads one setting with a fallback, for the odd one-off lookup. */
export function setting(
  settings: Record<string, string>,
  key: string,
  fallback = "",
): string {
  const v = settings[key];
  return v === undefined || v === "" ? fallback : v;
}

export function settingBool(settings: Record<string, string>, key: string, fallback = false): boolean {
  const v = settings[key];
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
}

/** The active items of one collection, in display order. */
/**
 * jsonb arrives parsed on some driver paths and as raw text on others
 * (`db.execute` with a raw SELECT is one of the latter), so normalise it here
 * rather than at every call site.
 */
function parseJsonObject(v: unknown): Record<string, unknown> {
  if (!v) return {};
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export async function getBlocks(collection: string): Promise<ContentBlock[]> {
  return safe(
    async () =>
      rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT id, title, subtitle, body, icon, image_url, link_url, link_label,
                 data, display_order
          FROM content_blocks
          WHERE collection = ${collection} AND is_active = true
          ORDER BY display_order ASC, id ASC
        `),
      ).map((r) => ({
        id: r.id as number,
        title: (r.title as string) ?? null,
        subtitle: (r.subtitle as string) ?? null,
        body: (r.body as string) ?? null,
        icon: (r.icon as string) ?? null,
        imageUrl: (r.image_url as string) ?? null,
        linkUrl: (r.link_url as string) ?? null,
        linkLabel: (r.link_label as string) ?? null,
        data: parseJsonObject(r.data),
        displayOrder: (r.display_order as number) ?? 0,
      })),
    [],
    `blocks:${collection}`,
  );
}

/* --------------------------- navigation --------------------------- */

export interface NavItem {
  id: number;
  label: string;
  url: string;
  newTab: boolean;
  children: NavItem[];
}

/**
 * One menu, already nested. Children are attached to their parent rather than
 * returned flat, so a component renders the tree without reassembling it.
 * An inactive parent takes its children with it.
 */
export async function getNav(menu: string): Promise<NavItem[]> {
  return safe(
    async () => {
      const all = rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT id, label, url, parent_id, opens_new_tab, display_order
          FROM nav_items
          WHERE menu = ${menu} AND is_active = true
          ORDER BY display_order ASC, id ASC
        `),
      );

      const byId = new Map<number, NavItem>();
      for (const r of all) {
        byId.set(r.id as number, {
          id: r.id as number,
          label: r.label as string,
          url: r.url as string,
          newTab: Boolean(r.opens_new_tab),
          children: [],
        });
      }

      const top: NavItem[] = [];
      for (const r of all) {
        const node = byId.get(r.id as number)!;
        const parentId = r.parent_id as number | null;
        const parent = parentId != null ? byId.get(parentId) : undefined;
        if (parent) parent.children.push(node);
        else if (parentId == null) top.push(node);
        // A child whose parent is inactive is dropped with it.
      }
      return top;
    },
    [],
    `nav:${menu}`,
  );
}

/* ----------------------------- page SEO ----------------------------- */

export interface PageSeo {
  title: string | null;
  description: string | null;
  keywords: string | null;
  ogImageUrl: string | null;
  noIndex: boolean;
}

/** Metadata for one route, or null to keep whatever the page ships with. */
export async function getPageSeo(route: string): Promise<PageSeo | null> {
  return safe(
    async () => {
      const r = rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT title, description, keywords, og_image_url, no_index
          FROM page_seo WHERE route = ${route} LIMIT 1
        `),
      )[0];
      if (!r) return null;
      return {
        title: (r.title as string) || null,
        description: (r.description as string) || null,
        keywords: (r.keywords as string) || null,
        ogImageUrl: (r.og_image_url as string) || null,
        noIndex: Boolean(r.no_index),
      };
    },
    null,
    `seo:${route}`,
  );
}

/**
 * Merges the admin's metadata over a page's defaults. Empty admin values fall
 * through, so clearing a field restores the shipped copy rather than blanking
 * the tag.
 */
export async function resolveMetadata(
  route: string,
  defaults: { title: string; description: string; keywords?: string },
) {
  const seo = await getPageSeo(route);
  const title = seo?.title || defaults.title;
  const description = seo?.description || defaults.description;
  const keywords = seo?.keywords || defaults.keywords;

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    ...(seo?.noIndex ? { robots: { index: false, follow: false } } : {}),
    // Without a canonical, the filter query strings on the college and cutoff
    // pages read as hundreds of near-duplicate URLs.
    alternates: { canonical: route },
    openGraph: {
      title,
      description,
      url: route,
      siteName: "AdmissionHands",
      type: "website",
      locale: "en_IN",
      images: [seo?.ogImageUrl || "/assets/images/logos/logo-4k.avif"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [seo?.ogImageUrl || "/assets/images/logos/logo-4k.avif"],
    },
  };
}

/* --------------------------- page sections --------------------------- */

export interface PageSection {
  key: string;
  label: string;
  order: number;
}

/**
 * The visible sections of a page, in the admin's order.
 *
 * Returns a helper rather than a bare list because pages ask two things:
 * "should I render this?" and "what order?". A section with no row is shown —
 * a component added in code should appear without needing a row first.
 */
export async function getSections(page: string) {
  const list = await safe(
    async () =>
      rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT section_key, label, display_order, is_visible
          FROM page_sections WHERE page = ${page}
          ORDER BY display_order ASC, id ASC
        `),
      ),
    [],
    `sections:${page}`,
  );

  const hidden = new Set(
    list.filter((r) => !r.is_visible).map((r) => r.section_key as string),
  );
  const order = new Map(
    list.map((r) => [r.section_key as string, r.display_order as number]),
  );

  return {
    /** Unknown keys are visible: new code should not need a row to render. */
    shows: (key: string) => !hidden.has(key),
    /** Sorts a list of section keys into the admin's order. */
    sort: <T extends { key: string }>(items: T[]) =>
      [...items].sort(
        (a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999),
      ),
  };
}

/* --------------------- the reconciled UG college list --------------------- */

export interface UgCollege {
  slug: string;
  name: string;
  state: string | null;
  city: string | null;
  universityName: string | null;
  collegeType: string | null;
  establishedYear: number | null;
  intake: number | null;
  imageUrl: string | null;
  displayOrder: number;
  /** How many published closing ranks this college has, 0 if none. */
  rankRows: number;
}

/**
 * Every UG college, with the admin's own facts layered on where they exist.
 *
 * Two tables describe UG colleges and neither is redundant:
 *
 *   institutes (level='ug')  1,727 rows — the complete list from the
 *                            counselling data, and the only one the closing
 *                            ranks attach to. Carries state, ownership and
 *                            establishment year, but no city/university/intake.
 *
 *   ug_all_colleges          765 rows the team curates by hand — city,
 *                            university, intake and type, which is exactly
 *                            what the colleges page displays.
 *
 * Reading only the CMS table showed 764 colleges while the predictor searched
 * 1,727: one site telling a student two different things. Reading only
 * `institutes` would drop the city and university from every card.
 *
 * So `institutes` is the spine and the CMS table enriches it, joined on the
 * name with punctuation and spacing removed — the two sources punctuate the
 * same college differently ("Government Medical College,Dindigul" against
 * "Government Medical College, Dindigul"). The join is live, so an admin edit
 * shows immediately rather than waiting for a re-sync.
 */
const loadUgColleges = unstable_cache(
  async (): Promise<UgCollege[]> =>
    safe(
    async () =>
      rows<Record<string, unknown>>(
        await db.execute(sql`
          WITH cms AS (
            SELECT DISTINCT ON (regexp_replace(lower(college_name), '[^a-z0-9]', '', 'g'))
                   regexp_replace(lower(college_name), '[^a-z0-9]', '', 'g') AS key,
                   city, university_name, college_type, intake, image_url, display_order
            FROM ug_all_colleges
            WHERE is_active = true
            ORDER BY regexp_replace(lower(college_name), '[^a-z0-9]', '', 'g'),
                     display_order ASC, id ASC
          ),
          -- MBBS rows only. The UG extract covers every undergraduate stream
          -- NEET feeds, so counting all of them would credit a dental college
          -- with "published cutoffs" on a page about MBBS.
          ranked AS (
            SELECT cr.institute_id, COUNT(*)::int AS n
            FROM closing_ranks cr
            JOIN courses c ON c.id = cr.course_id
            WHERE cr.level = 'ug' AND c.name ILIKE 'MBBS'
            GROUP BY cr.institute_id
          )
          SELECT i.slug, i.name, st.name AS state, i.established_year,
                 i.ownership::text AS ownership,
                 cms.city, cms.university_name, cms.college_type, cms.intake,
                 cms.image_url, COALESCE(cms.display_order, 0) AS display_order,
                 COALESCE(r.n, 0) AS rank_rows
          FROM institutes i
          LEFT JOIN states st ON st.id = i.state_id
          LEFT JOIN cms ON cms.key = regexp_replace(lower(i.name), '[^a-z0-9]', '', 'g')
          LEFT JOIN ranked r ON r.institute_id = i.id
          WHERE i.level = 'ug' AND i.is_active = true
            -- The page is titled "MBBS Colleges in India" and was listing 749
            -- dental, ayurveda, homoeopathy and nursing colleges alongside
            -- them, because the UG extract covers every NEET-fed stream. A
            -- college earns its place here by having MBBS cutoffs, or by the
            -- team having curated it in the CMS.
            AND (cms.key IS NOT NULL OR r.n > 0)
            -- ...and having MBBS cutoffs is not enough on its own, because the
            -- source attributes them wrongly. Four dental and homoeopathy
            -- colleges carry 79 MBBS rows on their own detail pages — verified
            -- against the saved HTML, so this is the source's error, not the
            -- import's. Where the college's own name names a different stream,
            -- the name is the better evidence. scripts/audit_ug_attribution.mjs
            -- re-checks this after every import.
            AND i.name !~* '(dental|ayurved|homoeopath|homeopath|nursing|physiothe|veterinar)'
          ORDER BY COALESCE(cms.display_order, 999999) ASC, i.name ASC
        `),
      ).map((r) => ({
        slug: r.slug as string,
        name: r.name as string,
        state: (r.state as string) ?? null,
        city: (r.city as string) ?? null,
        universityName: (r.university_name as string) ?? null,
        // The CMS type is the curated one. `ownership` is only a fallback
        // when the import actually set it — the UG extract never did, and
        // reading its 'other' as a type labelled every government college
        // "Private". An unknown type is left null so the UI can say nothing
        // rather than say something false.
        collegeType:
          (r.college_type as string) ??
          (r.ownership && r.ownership !== "other" ? (r.ownership as string) : null),
        establishedYear: (r.established_year as number) ?? null,
        intake: (r.intake as number) ?? null,
        imageUrl: (r.image_url as string) ?? null,
        displayOrder: (r.display_order as number) ?? 0,
        rankRows: (r.rank_rows as number) ?? 0,
      })),
    [],
    "ugColleges",
  ),
  ["ug-colleges-reconciled"],
  { revalidate: 600, tags: ["ug-colleges"] },
);

/**
 * Cached for ten minutes.
 *
 * The reconciliation joins 1,727 institutes against the curated table and
 * counts published rounds per college — real work for a list that only changes
 * when someone runs the import or edits a row. The page itself cannot be
 * cached (the root layout reads the host header, which rules out ISR for any
 * page that cannot enumerate its own params), so the cache goes here instead.
 */
export async function getUgColleges(): Promise<UgCollege[]> {
  return loadUgColleges();
}

/**
 * The curated facts for one UG college, keyed the same way as the list.
 *
 * The scrape gave `institutes` a name, state and establishment year but no
 * city, university or intake — those only exist in the CMS table, for the 765
 * the team curates. This looks up that enrichment for a single college so the
 * per-college page can show it where it exists.
 */
export async function getUgCollegeExtras(slug: string): Promise<{
  city: string | null;
  universityName: string | null;
  collegeType: string | null;
  intake: number | null;
  imageUrl: string | null;
} | null> {
  return safe(
    async () => {
      const r = rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT u.city, u.university_name, u.college_type, u.intake, u.image_url
          FROM institutes i
          JOIN ug_all_colleges u
            ON regexp_replace(lower(u.college_name), '[^a-z0-9]', '', 'g')
             = regexp_replace(lower(i.name), '[^a-z0-9]', '', 'g')
          WHERE i.slug = ${slug} AND i.level = 'ug' AND u.is_active = true
          ORDER BY u.display_order ASC, u.id ASC
          LIMIT 1
        `),
      )[0];
      if (!r) return null;
      return {
        city: (r.city as string) ?? null,
        universityName: (r.university_name as string) ?? null,
        collegeType: (r.college_type as string) ?? null,
        intake: (r.intake as number) ?? null,
        imageUrl: (r.image_url as string) ?? null,
      };
    },
    null,
    `ugCollegeExtras:${slug}`,
  );
}
