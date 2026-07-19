import crypto from "crypto";

import type { NormalizedOffer } from "@/types/offer";
import { OfferProvider, type RawOffer } from "@/providers/base/OfferProvider";

/**
 * AdGem publisher feed adapter.
 *
 * ⚠️ IMPORTANT before going live:
 * The endpoint shape and field names below follow AdGem's public wall
 * API conventions, but MUST be verified against the publisher docs for
 * your account (dashboard → Documentation) once credentials exist.
 * Only `fetchOffers()` and the candidate keys in `normalize()` should
 * need adjusting — the rest of the app is insulated by NormalizedOffer.
 */
export class AdGemProvider extends OfferProvider {
  readonly slug = "adgem";
  readonly name = "AdGem";

  isConfigured(): boolean {
    return Boolean(process.env.ADGEM_APP_ID);
  }

  /** Whether the S2S postback secret is present. */
  isPostbackConfigured(): boolean {
    return Boolean(process.env.ADGEM_POSTBACK_SECRET);
  }

  /**
   * Verify an AdGem server-to-server postback.
   *
   * AdGem appends `verifier` as the LAST query parameter; the verifier is
   * HMAC-SHA256, keyed with the postback secret, over the postback URL with
   * that `verifier` parameter removed.
   * https://docs.adgem.com/publisher-support/api-postback-setup/
   *
   * Behind a proxy/CDN the request host or scheme may be rewritten, which
   * would break the HMAC preimage. Set `ADGEM_POSTBACK_URL` to the exact
   * URL registered in the AdGem dashboard (scheme + host + path, no query)
   * so the signed base is reconstructed faithfully. The raw query string is
   * used verbatim (never re-encoded) so the preimage matches byte-for-byte.
   */
  verifyPostback(requestUrl: string): boolean {
    const secret = process.env.ADGEM_POSTBACK_SECRET;
    if (!secret) return false;

    const qIndex = requestUrl.indexOf("?");
    const rawQuery = qIndex >= 0 ? requestUrl.slice(qIndex + 1) : "";

    const match = rawQuery.match(/(?:^|&)verifier=([^&]*)/);
    if (!match) return false;
    const provided = match[1].toLowerCase();

    const signedQuery = rawQuery.replace(/(?:^|&)verifier=[^&]*/, "").replace(/^&/, "");

    const url = new URL(requestUrl);
    const base = process.env.ADGEM_POSTBACK_URL || `${url.origin}${url.pathname}`;
    const signedUrl = signedQuery ? `${base}?${signedQuery}` : base;

    const expected = crypto.createHmac("sha256", secret).update(signedUrl).digest("hex");

    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async fetchOffers(): Promise<RawOffer[]> {
    const appId = process.env.ADGEM_APP_ID;
    if (!appId) throw new Error("AdGem not configured: set ADGEM_APP_ID");

    // Defaults to the official AdGem Offer API. Overridable (e.g. staging
    // or a local fixture) via ADGEM_BASE_URL without touching code.
    const base = process.env.ADGEM_BASE_URL || "https://api.adgem.com/v1/wall/json";
    const url = new URL(base);
    url.searchParams.set("appid", appId);
    // The wall API requires a player id; we index with a static one and
    // attach real attribution via {click_id}/{user_id} macros at click time.
    url.searchParams.set("playerid", "offerhub-index");

    const apiKey = process.env.ADGEM_API_KEY;
    const res = await fetch(url.toString(), {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`AdGem API responded ${res.status}`);
    }

    const json = (await res.json()) as Record<string, unknown>;
    const data = (json.data ?? json.offers ?? []) as unknown;
    return Array.isArray(data) ? (data as RawOffer[]) : [];
  }

  protected normalize(raw: RawOffer): NormalizedOffer | null {
    const externalId = this.asString(raw.id ?? raw.campaign_id ?? raw.offer_id);
    const title = this.asString(raw.name ?? raw.title);
    const url = this.asString(raw.url ?? raw.click_url ?? raw.tracking_url);
    if (!externalId || !title || !url) return null;

    return {
      externalId,
      title,
      description: this.asString(raw.description ?? raw.short_description),
      requirements: this.asString(raw.instructions ?? raw.requirements),
      imageUrl: this.asString(raw.icon_url ?? raw.icon ?? raw.image_url),
      bannerUrl: this.asString(raw.banner_url ?? raw.creative_url),
      url,
      rewardAmount: this.asNumber(raw.amount ?? raw.reward ?? raw.payout) ?? 0,
      rewardCurrency: "USD",
      payout: this.asNumber(raw.payout),
      device: this.mapDevice(raw.os ?? raw.platform ?? raw.device),
      categorySlug: this.mapCategory(raw.category ?? raw.category_1 ?? raw.vertical),
      countries: this.mapCountries(raw.countries ?? raw.country ?? raw.geo),
      estimatedMinutes: this.asNumber(raw.estimated_minutes ?? raw.time_to_complete),
      approvalDays: this.asNumber(raw.approval_days ?? raw.approval_time),
      raw,
    };
  }
}
