import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { syncAll } from "@/services/sync.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Manual "Sync all now" trigger from the admin panel. */
export async function POST() {
  const session = await getServerAuthSession();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = await syncAll();
  return NextResponse.json({ ok: true, report });
}
