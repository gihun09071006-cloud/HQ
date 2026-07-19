import { NextResponse, type NextRequest } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { favoriteToggleSchema } from "@/lib/validation";
import { engagementService } from "@/services/engagement.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offers = await engagementService.getFavorites(session.user.id);
  return NextResponse.json({ items: offers });
}

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(req.headers);
  if (!rateLimit(`api:fav:${session.user.id}:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = favoriteToggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const result = await engagementService.toggleFavorite(session.user.id, parsed.data.offerId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }
}
