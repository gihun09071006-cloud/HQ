import { NextResponse, type NextRequest } from "next/server";

import { clientIp, rateLimit } from "@/lib/rate-limit";
import { offerService } from "@/services/offer.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`api:offer:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const offer = await offerService.getById(params.id);
  if (!offer || offer.status !== "ACTIVE") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(offer);
}
