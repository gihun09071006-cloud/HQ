import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { engagementService } from "@/services/engagement.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await engagementService.getHistory(session.user.id);
  return NextResponse.json({ items });
}
