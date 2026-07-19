import { db } from "@/lib/db";
import { logEvent } from "@/lib/logger";
import { offerRepository } from "@/repositories/offer.repository";
import { providerRepository } from "@/repositories/provider.repository";
import { getProviders } from "@/providers/registry";
import type { OfferProvider } from "@/providers/base/OfferProvider";
import { recomputeTrendScores } from "@/services/ranking.service";

export interface SyncReport {
  provider: string;
  synced: number;
  expired: number;
  skipped?: string;
  error?: string;
}

const UPSERT_CONCURRENCY = 8;

/**
 * The offer engine: pulls each configured network, normalizes through
 * its adapter, upserts into the unified Offer table, expires offers
 * that dropped out of the feed, and refreshes trending scores.
 */
export async function syncAll(): Promise<SyncReport[]> {
  const reports: SyncReport[] = [];
  for (const provider of getProviders()) {
    reports.push(await syncProvider(provider));
  }
  await recomputeTrendScores();
  return reports;
}

export async function syncProvider(provider: OfferProvider): Promise<SyncReport> {
  const record = await providerRepository.ensure(provider.slug, provider.name);

  if (record.status === "PAUSED") {
    return { provider: provider.slug, synced: 0, expired: 0, skipped: "paused by admin" };
  }
  if (!provider.isConfigured()) {
    await providerRepository.markSyncError(record.id, "Provider not configured (missing env vars)");
    return { provider: provider.slug, synced: 0, expired: 0, skipped: "not configured" };
  }

  const startedAt = new Date();
  try {
    const offers = await provider.getNormalizedOffers();

    // Feed-anomaly guard: a provider returning zero — or a small fraction of
    // its usual catalogue — is almost always a transient upstream failure
    // (rate limit, outage, auth blip), not "every offer legitimately
    // vanished". Skip the run so a blip can never expire the whole live
    // catalogue; the last good offers stay served.
    const activeCount = await db.offer.count({
      where: { providerId: record.id, status: "ACTIVE" },
    });
    const suspiciousDrop = activeCount >= 20 && offers.length < activeCount * 0.2;
    if (offers.length === 0 || suspiciousDrop) {
      const reason = offers.length === 0 ? "empty feed" : `feed dropped ${offers.length}/${activeCount}`;
      await providerRepository.markSyncError(record.id, `${reason} — sync skipped to protect catalogue`);
      logEvent("provider_failure", { provider: provider.slug, message: reason });
      return { provider: provider.slug, synced: 0, expired: 0, skipped: reason };
    }

    // Create categories up front so concurrent offer upserts don't race to
    // create the same brand-new category (unique-constraint violation).
    await offerRepository.ensureCategories(offers.map((o) => o.categorySlug));

    for (let i = 0; i < offers.length; i += UPSERT_CONCURRENCY) {
      const chunk = offers.slice(i, i + UPSERT_CONCURRENCY);
      await Promise.all(
        chunk.map((offer) => offerRepository.upsertFromNormalized(record.id, offer)),
      );
    }

    const [expired] = await Promise.all([
      offerRepository.expireUnseen(record.id, startedAt),
      offerRepository.reviveReseen(record.id, startedAt),
    ]);

    await providerRepository.markSyncSuccess(record.id, offers.length);
    return { provider: provider.slug, synced: offers.length, expired: expired.count };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await providerRepository.markSyncError(record.id, message);
    logEvent("provider_failure", { provider: provider.slug, message });
    return { provider: provider.slug, synced: 0, expired: 0, error: message };
  }
}
