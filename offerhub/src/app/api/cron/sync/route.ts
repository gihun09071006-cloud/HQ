import { NextResponse, type NextRequest } from "next/server";

import { confirmDueCompletions } from "@/services/confirm.service";
import { syncAll } from "@/services/sync.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Provider sync endpoint. Vercel Cron hits this daily (see vercel.json);
 * point an external scheduler (e.g. cron-job.org) here for a 30-min
 * cadence: GET /api/cron/sync with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  const isVercelCron = req.headers.get("user-agent")?.includes("vercel-cron") ?? false;
  const isAuthorized =
    (secret && auth === `Bearer ${secret}`) ||
    (isVercelCron && !secret) ||
    process.env.NODE_ENV === "development";

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const report = await syncAll();
  // Confirm PENDING completions whose hold window has elapsed (never confirm
  // value before the provider's approval window).
  const confirmed = await confirmDueCompletions();
  return NextResponse.json({ ok: true, tookMs: Date.now() - startedAt, report, confirmed });
}
