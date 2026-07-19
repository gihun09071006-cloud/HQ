import { AdGemProvider } from "@/providers/adgem/AdGemProvider";
import type { OfferProvider } from "@/providers/base/OfferProvider";
import { MockProvider } from "@/providers/mock/MockProvider";

/**
 * Single registration point for offer networks.
 * To onboard Torox / BitLabs / CPX / AyeT / RevU: implement an adapter
 * and add one line below. The sync engine, ranking, API and UI need no
 * changes.
 *
 * The mock provider is listed but only becomes active when
 * ENABLE_MOCK_PROVIDER !== "false"; in production (mock off, real keys set)
 * `getProviders()` returns only configured networks, so the catalogue is
 * built exclusively from real provider data.
 */
const registered: OfferProvider[] = [new MockProvider(), new AdGemProvider()];

/** Every registered adapter, regardless of configuration. */
export function getAllProviders(): OfferProvider[] {
  return registered;
}

/** Only providers whose credentials/flags are present (used by sync). */
export function getProviders(): OfferProvider[] {
  return registered.filter((p) => p.isConfigured());
}

export function getProvider(slug: string): OfferProvider | undefined {
  return registered.find((p) => p.slug === slug);
}
