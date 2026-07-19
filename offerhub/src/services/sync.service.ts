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
    return { provider: provider.slug, synced: 0, expired: 0, error: message };
  }
}
