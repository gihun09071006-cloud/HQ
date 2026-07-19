import type { DeviceType, OfferStatus } from "@prisma/client";

/**
 * The single unified shape every provider adapter must emit.
 * Provider A's `reward_amount`, Provider B's `reward`, Provider C's
 * `coins` — all become `rewardAmount` here. This is the contract that
 * lets us add Torox / BitLabs / CPX / AyeT / RevU without touching
 * anything outside `src/providers/`.
 */
export interface NormalizedOffer {
  externalId: string;
  title: string;
  description?: string | null;
  requirements?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  /** Outbound tracking URL. May contain {click_id} / {user_id} macros. */
  url: string;
  rewardAmount: number;
  rewardCurrency: string;
  /** Publisher payout (our revenue) when the API exposes it. */
  payout?: number | null;
  device: DeviceType;
  categorySlug?: string | null;
  /** ISO alpha-2 codes. Empty array ⇒ available worldwide. */
  countries: string[];
  estimatedMinutes?: number | null;
  approvalDays?: number | null;
  raw?: unknown;
}

/**
 * Frontend-safe view of a normalized offer.
 *
 * Deliberately omits every provider-economics field — `rewardAmount`,
 * `rewardCurrency`, `payout` (our revenue). The client only ever sees
 * `credits` (HQ Credits, an internal unit). This is the ONLY shape an
 * offer should take when leaving the server for the browser before it is
 * persisted. See `src/lib/credits.ts`.
 */
export interface PublicOffer {
  externalId: string;
  title: string;
  description: string | null;
  requirements: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  /** Outbound tracking URL. */
  url: string;
  /** HQ Credits only — never the provider reward or payout. */
  credits: number;
  device: DeviceType;
  categorySlug: string | null;
  /** ISO alpha-2 codes. Empty array ⇒ available worldwide. */
  countries: string[];
  estimatedMinutes: number | null;
  approvalDays: number | null;
  provider: { slug: string; name: string };
}

/**
 * The canonical HQ offer shape (the sprint's `HQOffer`). Every provider's
 * payload is normalized to this before ranking, storage and display. It is
 * the internal/server model: `providerReward` lives here for reconciliation
 * but MUST NOT be serialized to the client — the browser only ever sees
 * `hqCredits` (see OfferDTO). NormalizedOffer is the provider-adapter input
 * form of this model.
 */
export interface HQOffer {
  id: string;
  provider: string;
  providerOfferId: string;
  title: string;
  description: string;
  image: string;
  category: string;
  platform: DeviceType;
  country: string[];
  trackingUrl: string;
  estimatedMinutes: number;
  /** Provider reward — server-side only, never sent to the client. */
  providerReward: number;
  hqCredits: number;
}

/**
 * Serializable offer sent to the client (no Prisma Decimal / Date).
 * Provider economics are intentionally absent — only `hqCredits` ships.
 */
export interface OfferDTO {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  hqCredits: number;
  device: DeviceType;
  status: OfferStatus;
  isFeatured: boolean;
  estimatedMinutes: number | null;
  approvalDays: number | null;
  clickCount: number;
  provider: { slug: string; name: string };
  category: { slug: string; name: string } | null;
  countries: string[];
  createdAt: string;
}

export type SortOption = "trending" | "newest" | "reward" | "featured";

export interface OfferListResult {
  items: OfferDTO[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface CategoryWithCount {
  slug: string;
  name: string;
  count: number;
}

export interface CountryWithCount {
  code: string;
  name: string;
  count: number;
}
