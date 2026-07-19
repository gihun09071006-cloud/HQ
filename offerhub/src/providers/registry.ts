import { AdGemProvider } from "@/providers/adgem/AdGemProvider";
import type { OfferProvider } from "@/providers/base/OfferProvider";
import { MockProvider } from "@/providers/mock/MockProvider";

/**
 * Single registration point for offer networks.
 * To onboard Torox / BitLabs / CPX / AyeT / RevU: implement an adapter
 * and add one line below. The sync engine, ranking, API and UI need no
 * changes.
 */
const providers: OfferProvider[] = [new MockProvider(), new AdGemProvider()];

export function getProviders(): OfferProvider[] {
  return providers;
}

export function getProvider(slug: string): OfferProvider | undefined {
  return providers.find((p) => p.slug === slug);
}
