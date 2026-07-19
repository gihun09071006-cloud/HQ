import { engagementRepository } from "@/repositories/engagement.repository";
import { toOfferDTO } from "@/services/offer.service";
import type { OfferDTO } from "@/types/offer";

export const engagementService = {
  toggleFavorite(userId: string, offerId: string) {
    return engagementRepository.toggleFavorite(userId, offerId);
  },

  async getFavorites(userId: string): Promise<OfferDTO[]> {
    const rows = await engagementRepository.listFavorites(userId);
    return rows.map((r) => toOfferDTO(r.offer));
  },

  async getFavoriteIdSet(userId: string, offerIds: string[]): Promise<Set<string>> {
    if (!offerIds.length) return new Set();
    const rows = await engagementRepository.favoriteIds(userId, offerIds);
    return new Set(rows.map((r) => r.offerId));
  },

  recordView(userId: string, offerId: string) {
    return engagementRepository.recordView(userId, offerId).catch(() => undefined);
  },

  async getHistory(userId: string): Promise<{ offer: OfferDTO; viewedAt: string }[]> {
    const rows = await engagementRepository.listHistory(userId);
    return rows.map((r) => ({ offer: toOfferDTO(r.offer), viewedAt: r.viewedAt.toISOString() }));
  },

  createClick: engagementRepository.createClick,
};
