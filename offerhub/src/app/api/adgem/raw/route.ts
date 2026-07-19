import { NextResponse } from "next/server";

import { toPublicOffer } from "@/lib/credits";
import { AdGemProvider } from "@/providers/adgem/AdGemProvider";

/**
 * Raw AdGem feed — live from the official AdGem Offer API, normalized into
 * the HQ Offer model. Nothing is persisted. Only HQ Credits are exposed;
 * provider reward and payout stay server-side (see `toPublicOffer`).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const provider = new AdGemProvider();

  if (!provider.isConfigured()) {
    return NextResponse.json(
      { error: "AdGem is not configured. Set ADGEM_APP_ID in your environment." },
      { status: 503 },
    );
  }

  try {
    const meta = { slug: provider.slug, name: provider.name };
    const offers = await provider.getNormalizedOffers();
    const items = offers.map((o) => toPublicOffer(o, meta));

    return NextResponse.json({ provider: meta, count: items.length, items });
  } catch (error) {
    console.error("[adgem:raw]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AdGem fetch failed" },
      { status: 502 },
    );
  }
}
