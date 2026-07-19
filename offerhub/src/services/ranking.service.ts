import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import type { SortOption } from "@/types/offer";

export const TREND_WINDOW_HOURS = 72;

/**
 * MVP ranking: a deterministic sort per mode. Featured offers always
 * float first for "trending" and "featured" so manual curation from
 * the admin panel has an immediate effect.
 */
export function orderByFor(sort: SortOption): Prisma.OfferOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }, { rewardAmount: "desc" }];
    case "reward":
      return [{ rewardAmount: "desc" }, { trendScore: "desc" }];
    case "featured":
      return [{ isFeatured: "desc" }, { trendScore: "desc" }, { createdAt: "desc" }];
    case "trending":
    default:
      return [
        { isFeatured: "desc" },
        { trendScore: "desc" },
        { clickCount: "desc" },
        { createdAt: "desc" },
      ];
  }
}

/**
 * trendScore = clicks within the trailing window. Recomputed after each
 * sync run (and by the cron), cheap at MVP scale.
 */
export async function recomputeTrendScores(): Promise<void> {
  const since = new Date(Date.now() - TREND_WINDOW_HOURS * 60 * 60 * 1000);
  const counts = await db.click.groupBy({
    by: ["offerId"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });

  await db.offer.updateMany({ where: { trendScore: { gt: 0 } }, data: { trendScore: 0 } });
  if (!counts.length) return;

  await db.$transaction(
    counts.map((c) =>
      db.offer.update({
        where: { id: c.offerId },
        data: { trendScore: c._count._all },
      }),
    ),
  );
}
