/**
 * What the admin API is allowed to touch.
 *
 * This is the security boundary for every admin write. A request can only
 * reach a table named here, and can only set the columns listed against it —
 * table and column names are never taken from the request, so no payload can
 * widen what it writes. Anything not listed is simply not editable through
 * the API, no matter what the client sends.
 */

import { sql, type SQL } from "drizzle-orm";

export interface ResourceSpec {
  table: string;
  columns: readonly string[];
  orderBy: SQL;
  /** Tables with an `updated_at` column get it bumped on every write. */
  hasUpdatedAt: boolean;
  /** One-row tables (contact details) are edited without an id. */
  singleton?: boolean;
}

const COLLEGE_COLUMNS = [
  "slug",
  "college_name",
  "college_type",
  "state",
  "city",
  "university_name",
  "established_year",
  "intake",
  "nri_seats",
  "has_nri_seats",
  "is_women_only",
  "image_url",
  "display_order",
  "is_active",
] as const;

export const RESOURCE_SPECS: Record<string, ResourceSpec> = {
  alerts: {
    table: "live_alerts",
    // expires_at: an admin can keep an alert up longer, or take it down sooner.
    // The feed's own columns (source, source_key, auto) are not editable.
    columns: ["title", "link", "image_url", "is_active", "order_index", "expires_at"],
    orderBy: sql`is_active DESC, auto ASC, order_index ASC, published_at DESC NULLS LAST, id DESC`,
    hasUpdatedAt: false,
  },
  videos: {
    table: "videos",
    columns: ["title", "videos_id", "description", "featured"],
    orderBy: sql`featured DESC, created_at DESC`,
    hasUpdatedAt: false,
  },
  media: {
    table: "media_assets",
    columns: [
      "media_key",
      "title",
      "image_url",
      "mobile_image_url",
      "alt_text",
      "section_type",
      "display_order",
      "is_active",
    ],
    orderBy: sql`display_order ASC, id ASC`,
    hasUpdatedAt: true,
  },
  states: {
    table: "mbbs_states",
    columns: ["name", "slug", "image_url", "colleges_count", "content", "is_active"],
    orderBy: sql`name ASC`,
    hasUpdatedAt: true,
  },
  branches: {
    table: "pg_branches",
    columns: [
      "branch_name",
      "short_description",
      "icon_url",
      "category",
      "display_order",
      "is_active",
    ],
    orderBy: sql`display_order ASC, branch_name ASC`,
    hasUpdatedAt: false,
  },
  legal: {
    table: "legal_documents",
    columns: ["slug", "title", "content", "is_published"],
    orderBy: sql`created_at ASC`,
    hasUpdatedAt: true,
  },
  contact: {
    table: "contact_info",
    columns: ["phone_number", "whatsapp_number", "email", "lead_notification_phone"],
    orderBy: sql`id ASC`,
    hasUpdatedAt: true,
    singleton: true,
  },
  leads: {
    // The submitted details are never editable — only how the team has
    // triaged the lead. Letting staff rewrite a phone number would destroy
    // the only record of what the student actually sent.
    table: "leads",
    columns: [
      "lead_status",
      "is_read",
      "admin_notes",
      "assigned_to",
      "follow_up_on",
      "last_contacted_at",
    ],
    orderBy: sql`created_at DESC`,
    hasUpdatedAt: true,
  },
  "colleges-ug": {
    table: "ug_all_colleges",
    columns: COLLEGE_COLUMNS,
    orderBy: sql`display_order ASC, college_name ASC`,
    hasUpdatedAt: true,
  },
  "colleges-recommended": {
    table: "ug_recommended_colleges",
    columns: COLLEGE_COLUMNS,
    orderBy: sql`display_order ASC, college_name ASC`,
    hasUpdatedAt: true,
  },
  "colleges-deemed": {
    table: "deemed_colleges",
    columns: COLLEGE_COLUMNS,
    orderBy: sql`display_order ASC, college_name ASC`,
    hasUpdatedAt: true,
  },
  "colleges-pg-recommended": {
    table: "pg_recommended_colleges",
    columns: COLLEGE_COLUMNS,
    orderBy: sql`display_order ASC, college_name ASC`,
    hasUpdatedAt: true,
  },
  "colleges-pg-deemed": {
    table: "pg_deemed_colleges",
    columns: COLLEGE_COLUMNS,
    orderBy: sql`display_order ASC, college_name ASC`,
    hasUpdatedAt: true,
  },
  settings: {
    // The key, type and label describe the field itself and are seeded by
    // script — an editor changes the value, not the shape of the setting.
    table: "site_settings",
    columns: ["value"],
    orderBy: sql`group_name ASC, display_order ASC`,
    hasUpdatedAt: true,
  },
  blocks: {
    table: "content_blocks",
    columns: [
      "collection",
      "title",
      "subtitle",
      "body",
      "icon",
      "image_url",
      "link_url",
      "link_label",
      // Whatever a collection needs that the named columns do not cover
      // (a testimonial's outcome, an FAQ's category).
      "data",
      "display_order",
      "is_active",
    ],
    orderBy: sql`collection ASC, display_order ASC`,
    hasUpdatedAt: true,
  },
  collections: {
    table: "content_collections",
    columns: ["slug", "label", "description", "display_order"],
    orderBy: sql`display_order ASC`,
    hasUpdatedAt: false,
  },
  nav: {
    table: "nav_items",
    columns: [
      "menu",
      "label",
      "url",
      "parent_id",
      "display_order",
      "is_active",
      "opens_new_tab",
    ],
    orderBy: sql`menu ASC, display_order ASC, id ASC`,
    hasUpdatedAt: true,
  },
  seo: {
    // The route identifies the page and is not editable — repointing a row at
    // another route would silently move one page's metadata onto another.
    table: "page_seo",
    columns: ["page_label", "title", "description", "keywords", "og_image_url", "no_index"],
    orderBy: sql`route ASC`,
    hasUpdatedAt: true,
  },
  sections: {
    // The key is what the page code looks up; only order and visibility move.
    table: "page_sections",
    columns: ["label", "description", "display_order", "is_visible"],
    orderBy: sql`page ASC, display_order ASC`,
    hasUpdatedAt: true,
  },
  "colleges-pg": {
    table: "pg_colleges_content",
    columns: [
      "college_name",
      "city",
      "state",
      "college_type",
      "ownership",
      "year_established",
      "total_pg_seats",
      // A JSON array stored as text, exactly as the migration copied it.
      "key_specialties",
      "short_description",
      "image_url",
      "display_order",
      "is_active",
    ],
    orderBy: sql`display_order ASC, college_name ASC`,
    hasUpdatedAt: true,
  },
};

/**
 * Drops every field the resource does not allow. Empty strings become NULL.
 *
 * Objects and arrays are serialised to JSON text: the driver sends them as
 * untyped parameters, which Postgres coerces into the target jsonb column.
 * Passing the object through raw would be sent as a Postgres array instead.
 */
export function pickColumns(
  body: Record<string, unknown>,
  allowed: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const col of allowed) {
    if (!(col in body)) continue;
    const v = body[col];
    if (v === "") out[col] = null;
    else if (v !== null && typeof v === "object") out[col] = JSON.stringify(v);
    else out[col] = v;
  }
  return out;
}
