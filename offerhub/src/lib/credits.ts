import { CreditEngine } from "@/lib/CreditEngine";
import type { NormalizedOffer, PublicOffer } from "@/types/offer";

/**
 * HQ Credits helpers — SERVER-SIDE ONLY. The conversion lives in the
 * CreditEngine; this module only adapts a normalized offer to it and strips
 * provider economics before anything reaches the browser.
 *
 * Per the HQ Core Principles (/PRINCIPLES.md): Credits are an internal,
 * non-monetary unit; provider revenue (our payout) never leaves the server.
 */

/**
 * Strip all provider economics and expose only HQ Credits.
 *
 * The single chokepoint an offer passes through before the browser:
 * `rewardAmount`, `rewardCurrency`, `payout` and `raw` are dropped here.
 * Credits are sized from the payout (our revenue) via the CreditEngine,
 * falling back to the user-facing reward value when payout is unknown.
 */
export function toPublicOffer(
  offer: NormalizedOffer,
  provider: { slug: string; name: string },
): PublicOffer {
  return {
    externalId: offer.externalId,
    title: offer.title,
    description: offer.description ?? null,
    requirements: offer.requirements ?? null,
    imageUrl: offer.imageUrl ?? null,
    bannerUrl: offer.bannerUrl ?? null,
    url: offer.url,
    credits: CreditEngine.compute({ payoutUsd: offer.payout ?? null, rewardUsd: offer.rewardAmount }),
    device: offer.device,
    categorySlug: offer.categorySlug ?? null,
    countries: offer.countries,
    estimatedMinutes: offer.estimatedMinutes ?? null,
    approvalDays: offer.approvalDays ?? null,
    provider,
  };
}
