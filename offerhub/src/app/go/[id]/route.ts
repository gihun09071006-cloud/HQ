import { NextResponse, type NextRequest } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { engagementService } from "@/services/engagement.service";

export const dynamic = "force-dynamic";

/**
 * The revenue path. Records a Click, injects attribution macros into
 * the provider's tracking URL and 302-redirects the user out.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`go:${ip}`, 30, 60_000)) {
    return NextResponse.redirect(new URL(`/offers/${params.id}`, req.url));
  }

  const offer = await db.offer.findUnique({
    where: { id: params.id },
    select: { id: true, url: true, status: true },
  });
  if (!offer || offer.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/offers", req.url));
  }

  const session = await getServerAuthSession();
  const userId = session?.user?.id ?? null;
  const country =
    req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? null;
  const ua = req.headers.get("user-agent") ?? "";
  const device = /android/i.test(ua) ? "android" : /iphone|ipad|ios/i.test(ua) ? "ios" : "web";

  const click = await engagementService.createClick({
    offerId: offer.id,
    userId,
    country,
    device,
    referer: req.headers.get("referer"),
  });

  const target = offer.url
    .replaceAll("{click_id}", click.id)
    .replaceAll("{user_id}", userId ?? `guest-${click.id.slice(-8)}`);

  return NextResponse.redirect(target, { status: 302 });
}
