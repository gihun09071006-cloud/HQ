import type { NormalizedOffer, PublicOffer } from "@/types/offer";

/**
 * HQ Credits conversion — SERVER-SIDE ONLY.
 *
 * Per the HQ Core Principles (see /PRINCIPLES.md):
 *   • Credits are an internal unit, not currency, with no fixed cash value.
 *   • Provider revenue (our payout) must never leave the server.
 *
 * The raw provider reward and the provider payout are inputs to this
 * conversion but are NEVER serialized to the client. The frontend only
 * ever receives `credits`. The multiplier is a server-side business
 * setting, tunable via `HQ_CREDITS_PER_UNIT` without touching code.
 */
const DEFAULT_CREDITS_PER_UNIT = 100;

export function creditsPerUnit(): number {
  const raw = Number(process.env.HQ_CREDITS_PER_UNIT);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CREDITS_PER_UNIT;
}

/** Provider user-reward → whole-number HQ Credits. */
export function toCredits(rewardAmount: number): number {
  if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) return 0;
  return Math.max(0, Math.round(rewardAmount * creditsPerUnit()));
}

/**
 * Strip all provider economics and expose only HQ Credits.
 *
 * This is the single chokepoint an offer must pass through before it is
 * sent to the browser: `rewardAmount`, `rewardCurrency`, `payout` and the
 * `raw` payload are intentionally dropped here.
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
    credits: toCredits(offer.rewardAmount),
    device: offer.device,
    categorySlug: offer.categorySlug ?? null,
    countries: offer.countries,
    estimatedMinutes: offer.estimatedMinutes ?? null,
    approvalDays: offer.approvalDays ?? null,
    provider,
  };
}
