import { CreditEngine } from "@/lib/CreditEngine";
import type { NormalizedOffer, PublicOffer } from "@/types/offer";

/**
 * HQ Credits helpers — SERVER-SIDE ONLY. Conversion lives in the
 * CreditEngine; this module only adapts offers to it and strips provider
 * economics before anything reaches the browser.
 *
 * Per the HQ Core Principles (/PRINCIPLES.md): credits are an internal
 * unit, and provider revenue (our payout) must never leave the server.
 */

/** Provider reward → HQ Credits, seeded by a stable key for jitter. */
export function toCredits(rewardAmount: number, seed: string): number {
  return CreditEngine.compute(rewardAmount, seed);
}

/**
 * Strip all provider economics and expose only HQ Credits.
 *
 * The single chokepoint an offer passes through before the browser:
 * `rewardAmount`, `rewardCurrency`, `payout` and `raw` are dropped here.
 * Credits are seeded by the provider offer id so the figure is stable and
 * matches what the completion postback will grant.
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
    credits: toCredits(offer.rewardAmount, offer.externalId),
    device: offer.device,
    categorySlug: offer.categorySlug ?? null,
    countries: offer.countries,
    estimatedMinutes: offer.estimatedMinutes ?? null,
    approvalDays: offer.approvalDays ?? null,
    provider,
  };
}
