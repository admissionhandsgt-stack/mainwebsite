import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Never let a generated migration drop a table that holds imported data.
  strict: true,
  verbose: true,
} satisfies Config;
