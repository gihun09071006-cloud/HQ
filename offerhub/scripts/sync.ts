import "dotenv/config";

import { syncAll } from "../src/services/sync.service";

/** CLI entry: `npm run sync` — same engine as /api/cron/sync. */
async function main() {
  console.log("→ Syncing all providers…\n");
  const report = await syncAll();
  console.table(report);
  const failed = report.filter((r) => r.error);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
