// Sync the NMC college-and-course register now, from this machine (2026-10-18).
// The site does the same weekly (POST /api/cron/nmc) and from Admin → Data sync;
// this is for the first import and for checking a change to lib/nmcSync.ts.
//   npx tsx --env-file=.env.local scripts/sync_nmc.ts [who]
import { syncNmc } from "@/lib/nmcSync";

const result = await syncNmc(process.argv[2] ?? "script");
console.log(result);
process.exit(0);
