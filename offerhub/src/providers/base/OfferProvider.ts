import type { DeviceType } from "@prisma/client";

import type { NormalizedOffer } from "@/types/offer";

export type RawOffer = Record<string, unknown>;

/**
 * Base class every offer network adapter extends.
 *
 * Adding a new network (Torox, BitLabs, CPX, AyeT, RevU, ...) means:
 *   1. Create `src/providers/<slug>/<Name>Provider.ts` extending this class.
 *   2. Implement `fetchOffers()` (HTTP) and `normalize()` (field mapping).
 *   3. Register one instance in `src/providers/registry.ts`.
 * Nothing outside `src/providers/` changes.
 */
export abstract class OfferProvider {
  abstract readonly slug: string;
  abstract readonly name: string;

  /** Whether required credentials/env are present. */
  isConfigured(): boolean {
    return true;
  }

  /** Fetch the raw offer feed from the network's API. */
  abstract fetchOffers(): Promise<RawOffer[]>;

  /** Map one raw payload into the unified model. Return null to skip. */
  protected abstract normalize(raw: RawOffer): NormalizedOffer | null;

  /** Fetch + normalize, skipping (and logging) individually broken rows. */
  async getNormalizedOffers(): Promise<NormalizedOffer[]> {
    const raw = await this.fetchOffers();
    const offers: NormalizedOffer[] = [];
    for (const item of raw) {
      try {
        const normalized = this.normalize(item);
        if (normalized) offers.push(normalized);
      } catch (error) {
        console.warn(`[provider:${this.slug}] skipped malformed offer`, error);
      }
    }
    return offers;
  }

  // ── Shared coercion helpers for messy third-party payloads ──

  protected asString(value: unknown): string | null {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    return null;
  }

  protected asNumber(value: unknown): number | null {
    const n =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? parseFloat(value.replace(/[^0-9.\-]/g, ""))
          : NaN;
    return Number.isFinite(n) ? n : null;
  }

  protected mapDevice(value: unknown): DeviceType {
    const v = this.asString(value)?.toLowerCase() ?? "";
    if (v.includes("android")) return "ANDROID";
    if (v.includes("ios") || v.includes("iphone") || v.includes("ipad")) return "IOS";
    if (v.includes("web") || v.includes("desktop")) return "WEB";
    return "ALL";
  }

  /** Collapse free-form provider categories into OfferHub's canonical slugs. */
  protected mapCategory(value: unknown): string {
    const v = this.asString(value)?.toLowerCase() ?? "";
    if (v.includes("game") || v.includes("gaming")) return "game";
    if (v.includes("survey") || v.includes("quiz")) return "survey";
    if (v.includes("crypto") || v.includes("defi") || v.includes("exchange") || v.includes("wallet"))
      return "crypto";
    if (v.includes("finance") || v.includes("bank") || v.includes("invest") || v.includes("trading"))
      return "finance";
    if (v.includes("video") || v.includes("watch")) return "video";
    if (v.includes("sign") || v.includes("register") || v.includes("trial")) return "signup";
    if (v.includes("app")) return "app";
    return "other";
  }

  /** Accepts "US,GB", ["us","gb"], "ALL", null → uppercase ISO codes ([] = global). */
  protected mapCountries(value: unknown): string[] {
    let list: string[] = [];
    if (Array.isArray(value)) {
      list = value.map((v) => this.asString(v) ?? "").filter(Boolean);
    } else if (typeof value === "string") {
      list = value.split(/[,;|\s]+/);
    }
    const codes = list
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c));
    // "ALL"/"WW"/empty ⇒ worldwide
    return codes.filter((c) => c !== "WW");
  }
}
