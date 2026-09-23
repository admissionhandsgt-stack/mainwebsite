/**
 * AdmissionHands — PostgreSQL schema.
 *
 * Shape follows the counselling data itself, not the old Supabase tables:
 * a small set of master tables (institutes, courses, quotas, categories,
 * counsellings) and two large fact tables (closing_ranks, fees) that
 * everything else reads from.
 *
 * Both levels live in one set of tables, separated by `level` ('ug' | 'pg'),
 * because every query the product runs — predictor, cutoff explorer, fee
 * calculator — is identical for MBBS and MD/MS apart from that filter.
 */

import {
  pgTable,
  serial,
  integer,
  smallint,
  text,
  varchar,
  boolean,
  real,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

export const levelEnum = pgEnum("level", ["ug", "pg"]);
export const ownershipEnum = pgEnum("ownership", [
  "government",
  "private",
  "deemed",
  "central",
  "aiims",
  "jipmer",
  "esic",
  "other",
]);

/* ------------------------------------------------------------------ *
 * Master tables
 * ------------------------------------------------------------------ */

export const states = pgTable(
  "states",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    shortCode: varchar("short_code", { length: 8 }),
    /** Domicile / bond / category rules, kept as JSON because every state differs. */
    rules: text("rules"),
  },
  (t) => [uniqueIndex("states_slug_idx").on(t.slug)],
);

export const institutes = pgTable(
  "institutes",
  {
    id: serial("id").primaryKey(),
    /** Stable id from the source extract, so re-imports update instead of duplicating. */
    sourceId: integer("source_id"),
    name: text("name").notNull(),
    shortName: text("short_name"),
    slug: varchar("slug", { length: 180 }).notNull(),
    level: levelEnum("level").notNull(),
    ownership: ownershipEnum("ownership").notNull().default("other"),
    stateId: integer("state_id").references(() => states.id),
    district: text("district"),
    city: text("city"),
    university: text("university"),
    management: text("management"),
    establishedYear: smallint("established_year"),
    beds: integer("beds"),
    seatsTotal: integer("seats_total"),
    branchCount: smallint("branch_count"),
    mbbsIntake: integer("mbbs_intake"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("institutes_slug_idx").on(t.slug),
    index("institutes_level_state_idx").on(t.level, t.stateId),
    index("institutes_source_idx").on(t.sourceId, t.level),
    index("institutes_order_idx").on(t.displayOrder, t.name),
  ],
);

export const courses = pgTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id"),
    name: text("name").notNull(),
    shortName: text("short_name"),
    slug: varchar("slug", { length: 160 }).notNull(),
    level: levelEnum("level").notNull(),
    /** Degree / Diploma / Degree(6 Years) as published by the authority. */
    degreeType: text("degree_type"),
    courseType: text("course_type"),
    /** Clinical / para-clinical / non-clinical — drives the "clinical only" filter. */
    branchGroup: text("branch_group"),
    durationYears: real("duration_years"),
  },
  (t) => [
    uniqueIndex("courses_slug_level_idx").on(t.slug, t.level),
    index("courses_source_idx").on(t.sourceId),
  ],
);

export const counsellings = pgTable(
  "counsellings",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id"),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    level: levelEnum("level").notNull(),
    /** 'All India PG', 'Maharashtra PG', 'Open States' … */
    stateGroup: text("state_group"),
    stateId: integer("state_id").references(() => states.id),
    authority: text("authority"),
  },
  (t) => [uniqueIndex("counsellings_slug_idx").on(t.slug)],
);

export const quotas = pgTable(
  "quotas",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 48 }).notNull(),
    label: text("label").notNull(),
    /** Normalised bucket (AIQ / State / Management / NRI / Deemed …). */
    masterQuota: text("master_quota"),
  },
  (t) => [uniqueIndex("quotas_code_idx").on(t.code)],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 48 }).notNull(),
    label: text("label").notNull(),
    /** GEN / OBC / SC / ST / EWS after normalising the state-specific codes. */
    verticalCategory: text("vertical_category"),
    isPwd: boolean("is_pwd").notNull().default(false),
    /** Which state's coding scheme this belongs to; null = national. */
    scheme: text("scheme"),
  },
  (t) => [uniqueIndex("categories_code_scheme_idx").on(t.code, t.scheme)],
);

/* ------------------------------------------------------------------ *
 * Fact tables — the two that carry the volume
 * ------------------------------------------------------------------ */

/**
 * One row per (counselling, institute, course, quota, category, year, round).
 * ~230k rows for PG alone today, and the same again once UG lands, so every
 * query path the product uses has a covering index below.
 */
export const closingRanks = pgTable(
  "closing_ranks",
  {
    id: serial("id").primaryKey(),
    level: levelEnum("level").notNull(),
    counsellingId: integer("counselling_id").references(() => counsellings.id),
    instituteId: integer("institute_id").references(() => institutes.id),
    courseId: integer("course_id").references(() => courses.id),
    quotaId: integer("quota_id").references(() => quotas.id),
    categoryId: integer("category_id").references(() => categories.id),

    year: smallint("year").notNull(),
    round: smallint("round"),
    roundLabel: varchar("round_label", { length: 24 }),

    closingRank: integer("closing_rank"),
    /** All-India rank, where the authority publishes both. */
    aiRank: integer("ai_rank"),
    counsellingRank: integer("counselling_rank"),
    seatsAllotted: integer("seats_allotted"),

    feeInr: real("fee_inr"),
    bondYears: real("bond_years"),

    /** Set when the source flagged the row as derived rather than published. */
    lowConfidence: boolean("low_confidence").notNull().default(false),
    rankBasis: text("rank_basis"),
    extractedAt: timestamp("extracted_at", { withTimezone: true }),
  },
  (t) => [
    // Predictor: "everything at or above my rank, for my category and state"
    index("cr_predict_idx").on(t.level, t.year, t.categoryId, t.closingRank),
    // Cutoff explorer facets
    index("cr_facet_idx").on(t.level, t.counsellingId, t.courseId, t.quotaId, t.categoryId),
    // College detail page: this college's trend across years
    index("cr_institute_idx").on(t.instituteId, t.year, t.round),
    index("cr_course_idx").on(t.courseId, t.year),
  ],
);

/**
 * Fee, hostel, stipend and bond per seat. Kept separate from closing_ranks
 * because a fee is a property of the seat, not of a particular round.
 */
export const fees = pgTable(
  "fees",
  {
    id: serial("id").primaryKey(),
    level: levelEnum("level").notNull(),
    instituteId: integer("institute_id").references(() => institutes.id),
    courseId: integer("course_id").references(() => courses.id),
    quotaId: integer("quota_id").references(() => quotas.id),
    counsellingId: integer("counselling_id").references(() => counsellings.id),

    feeSession: text("fee_session"),
    feeInr: real("fee_inr"),
    feePeriodicity: text("fee_periodicity"),
    feeUsd: real("fee_usd"),
    /** Why a fee is missing, so the UI can say so instead of showing a blank. */
    feeNullReason: text("fee_null_reason"),

    hostelMinInr: real("hostel_min_inr"),
    hostelMaxInr: real("hostel_max_inr"),
    hostelNote: text("hostel_note"),

    stipendY1Inr: real("stipend_y1_inr"),
    stipendY2Inr: real("stipend_y2_inr"),
    stipendY3Inr: real("stipend_y3_inr"),
    stipendPeriodicity: text("stipend_periodicity"),
    stipendNote: text("stipend_note"),

    bondYears: real("bond_years"),
    bondPenaltyInr: real("bond_penalty_inr"),
    bondNote: text("bond_note"),

    year: smallint("year"),
    isCarriedForward: boolean("is_carried_forward").notNull().default(false),
  },
  (t) => [
    index("fees_institute_idx").on(t.instituteId, t.courseId),
    index("fees_level_fee_idx").on(t.level, t.feeInr),
  ],
);


/* ================================================================== *
 * Site content — the CMS tables, migrated off Supabase.
 *
 * These are editorial: an admin curates them, and they drive the
 * marketing pages. They are deliberately separate from the counselling
 * tables above (`institutes`, `closing_ranks`, `fees`), which are
 * imported from published data and never hand-edited.
 *
 * Column names match the Supabase originals so the migration is 1:1 and
 * the admin screens keep working with minimal change.
 * ================================================================== */

/** Shared shape of the four curated college lists. */
const collegeListColumns = {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 200 }).notNull(),
  collegeName: text("college_name").notNull(),
  collegeType: text("college_type"),
  state: text("state"),
  city: text("city"),
  universityName: text("university_name"),
  establishedYear: smallint("established_year"),
  intake: integer("intake"),
  nriSeats: integer("nri_seats"),
  minoritySeats: integer("minority_seats"),
  hasNriSeats: boolean("has_nri_seats").notNull().default(false),
  hasMinoritySeats: boolean("has_minority_seats").notNull().default(false),
  isWomenOnly: boolean("is_women_only").notNull().default(false),
  imageUrl: text("image_url"),
  sourceType: text("source_type"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

/** Every MBBS college shown on the UG listing. */
export const ugAllColleges = pgTable("ug_all_colleges", collegeListColumns, (t) => [
  uniqueIndex("ug_all_slug_idx").on(t.slug),
  index("ug_all_order_idx").on(t.displayOrder, t.collegeName),
  index("ug_all_state_idx").on(t.state),
]);

/** The shorter, hand-picked UG list used on the homepage. */
export const ugRecommendedColleges = pgTable("ug_recommended_colleges", collegeListColumns, (t) => [
  uniqueIndex("ug_rec_slug_idx").on(t.slug),
  index("ug_rec_order_idx").on(t.displayOrder, t.collegeName),
]);

/** Deemed universities shown on the MBBS deemed page. */
export const deemedColleges = pgTable("deemed_colleges", collegeListColumns, (t) => [
  uniqueIndex("deemed_slug_idx").on(t.slug),
  index("deemed_order_idx").on(t.displayOrder, t.collegeName),
]);

/** PG colleges curated for the MD/MS marketing pages. */
export const pgCollegesContent = pgTable(
  "pg_colleges_content",
  {
    id: serial("id").primaryKey(),
    collegeName: text("college_name").notNull(),
    city: text("city"),
    state: text("state"),
    collegeType: text("college_type"),
    ownership: text("ownership"),
    yearEstablished: smallint("year_established"),
    totalPgSeats: integer("total_pg_seats"),
    /** Stored as JSON text — the source is a Postgres array we do not query into. */
    keySpecialties: text("key_specialties"),
    shortDescription: text("short_description"),
    imageUrl: text("image_url"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("pg_content_order_idx").on(t.displayOrder, t.collegeName)],
);

/** Legacy homepage list, kept because `domain` splits it across UG and PG. */
export const recommendedColleges = pgTable("recommended_colleges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  fees: text("fees"),
  seats: integer("seats"),
  image: text("image"),
  domain: levelEnum("domain").notNull().default("ug"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** PG specialisations listed on the MD/MS page. */
export const pgBranches = pgTable(
  "pg_branches",
  {
    id: serial("id").primaryKey(),
    branchName: text("branch_name").notNull(),
    shortDescription: text("short_description"),
    iconUrl: text("icon_url"),
    category: text("category"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("pg_branches_order_idx").on(t.displayOrder, t.branchName)],
);

/** The state pages under /mbbs-india/[stateName]. */
export const mbbsStates = pgTable(
  "mbbs_states",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    imageUrl: text("image_url"),
    collegesCount: integer("colleges_count"),
    /** Long-form markdown for the state page. */
    content: text("content"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("mbbs_states_slug_idx").on(t.slug)],
);

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  /** The YouTube id, not a URL. */
  videosId: text("videos_id").notNull(),
  description: text("description"),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const legalDocuments = pgTable(
  "legal_documents",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: text("title").notNull(),
    /** Markdown, rendered by the legal pages. */
    content: text("content").notNull(),
    lastUpdated: timestamp("last_updated", { withTimezone: true }),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("legal_slug_idx").on(t.slug)],
);

export const contactInfo = pgTable("contact_info", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number"),
  whatsappNumber: text("whatsapp_number"),
  email: text("email"),
  /** Where new-lead WhatsApp notifications are sent. */
  leadNotificationPhone: text("lead_notification_phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ------------------------------------------------------------------ *
 * Leads
 * ------------------------------------------------------------------ */

/**
 * One table for both levels.
 *
 * Supabase had `pg_leads` plus a `leads` table that was referenced in code
 * but never actually existed — every UG submission silently fell through to
 * the PG table or was dropped. A single table with `level` removes that
 * whole class of bug.
 */
export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    level: levelEnum("level"),
    name: text("name"),
    phone: varchar("phone", { length: 24 }).notNull(),
    email: text("email"),
    rank: integer("rank"),
    preferredBranch: text("preferred_branch"),
    preferredState: text("preferred_state"),
    quotaInterest: text("quota_interest"),
    internshipStatus: text("internship_status"),
    category: text("category"),
    message: text("message"),
    sourcePage: text("source_page"),
    leadStatus: text("lead_status").notNull().default("new"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("leads_created_idx").on(t.createdAt),
    index("leads_phone_idx").on(t.phone),
    index("leads_status_idx").on(t.leadStatus, t.createdAt),
  ],
);

/* ------------------------------------------------------------------ *
 * Site chrome
 * ------------------------------------------------------------------ */

export const liveAlerts = pgTable(
  "live_alerts",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    link: text("link"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("alerts_order_idx").on(t.isActive, t.orderIndex)],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: serial("id").primaryKey(),
    mediaKey: varchar("media_key", { length: 120 }).notNull(),
    title: text("title"),
    imageUrl: text("image_url").notNull(),
    mobileImageUrl: text("mobile_image_url"),
    altText: text("alt_text"),
    sectionType: text("section_type"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("media_key_idx").on(t.mediaKey)],
);

/* ------------------------------------------------------------------ *
 * Admin users — replaces Supabase Auth
 * ------------------------------------------------------------------ */

export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 180 }).notNull(),
    /** scrypt hash; never a plaintext or reversible value. */
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("admin_email_idx").on(t.email)],
);

/** Server-side sessions. A logout deletes the row, so it cannot be replayed. */
export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("admin_sessions_user_idx").on(t.userId)],
);
