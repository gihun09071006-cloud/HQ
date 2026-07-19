import { db } from "@/lib/db";
import { offerInclude } from "@/repositories/offer.repository";

export const engagementRepository = {
  async toggleFavorite(userId: string, offerId: string): Promise<{ favorited: boolean }> {
    const existing = await db.favorite.findUnique({
      where: { userId_offerId: { userId, offerId } },
    });
    if (existing) {
      await db.favorite.delete({ where: { userId_offerId: { userId, offerId } } });
      return { favorited: false };
    }
    await db.favorite.create({ data: { userId, offerId } });
    return { favorited: true };
  },

  listFavorites(userId: string) {
    return db.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { offer: { include: offerInclude } },
    });
  },

  favoriteIds(userId: string, offerIds: string[]) {
    return db.favorite.findMany({
      where: { userId, offerId: { in: offerIds } },
      select: { offerId: true },
    });
  },

  recordView(userId: string, offerId: string) {
    return db.viewHistory.create({ data: { userId, offerId } });
  },

  listHistory(userId: string, take = 50) {
    return db.viewHistory.findMany({
      where: { userId },
      orderBy: { viewedAt: "desc" },
      take,
      include: { offer: { include: offerInclude } },
    });
  },

  createClick(data: {
    offerId: string;
    provider?: string | null;
    userId?: string | null;
    country?: string | null;
    device?: string | null;
    ipHash?: string | null;
    userAgent?: string | null;
    referer?: string | null;
  }) {
    return db.$transaction(async (tx) => {
      const click = await tx.click.create({ data });
      await tx.offer.update({
        where: { id: data.offerId },
        data: { clickCount: { increment: 1 } },
      });
      return click;
    });
  },
};
