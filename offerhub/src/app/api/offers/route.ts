import { NextResponse, type NextRequest } from "next/server";

import { clientIp, rateLimit } from "@/lib/rate-limit";
import { parseOfferQuery } from "@/lib/validation";
import { offerService } from "@/services/offer.service";

export const dynamic = "force-dynamic";

/** Public search API: GET /api/offers?q=&category=&country=&device=&minReward=&sort=&page= */
export async function GET(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`api:offers:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const query = parseOfferQuery(Object.fromEntries(req.nextUrl.searchParams));
  const result = await offerService.list(query);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
