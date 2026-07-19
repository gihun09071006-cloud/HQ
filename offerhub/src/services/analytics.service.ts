import { db } from "@/lib/db";

export interface AnalyticsSummary {
  windowDays: number;
  clicks: number;
  views: number;
  ctr: number | null; // clicks / detail views within the window
  activeOffers: number;
  users: number;
  /** Real-time "today" KPIs (since local midnight of the server). */
  today: {
    clicks: number;
    completions: number;
    conversionRate: number | null; // completions / clicks
  };
  /** Estimated provider revenue within the window (admin-only aggregate). */
  estProviderRevenue: number;
  /** All-time HQ Credits CONFIRMED (spendable) via completions. */
  totalCreditsIssued: number;
  /** HQ Credits currently held PENDING (awaiting the approval window). */
  pendingCredits: number;
  topOffers: { id: string; title: string; clicks: number }[];
  topCountries: { country: string; clicks: number }[];
  topCategories: { category: string; clicks: number }[];
}

export const analyticsService = {
  async summary(windowDays = 7): Promise<AnalyticsSummary> {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      clicks,
      views,
      activeOffers,
      users,
      offerGroups,
      countryGroups,
      todayClicks,
      todayCompletions,
      revenueAgg,
      creditsAgg,
      pendingAgg,
    ] = await Promise.all([
      db.click.count({ where: { createdAt: { gte: since } } }),
      db.viewHistory.count({ where: { viewedAt: { gte: since } } }),
      db.offer.count({ where: { status: "ACTIVE" } }),
      db.user.count(),
      db.click.groupBy({
        by: ["offerId"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { offerId: "desc" } },
        take: 25,
      }),
      db.click.groupBy({
        by: ["country"],
        where: { createdAt: { gte: since }, country: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { country: "desc" } },
        take: 8,
      }),
      db.click.count({ where: { createdAt: { gte: startOfToday } } }),
      db.offerCompletion.count({ where: { createdAt: { gte: startOfToday } } }),
      db.offerCompletion.aggregate({
        _sum: { payout: true },
        where: { createdAt: { gte: since } },
      }),
      db.offerCompletion.aggregate({ _sum: { credits: true }, where: { status: "CONFIRMED" } }),
      db.offerCompletion.aggregate({ _sum: { credits: true }, where: { status: "PENDING" } }),
    ]);

    const offerIds = offerGroups.map((g) => g.offerId);
    const offers = offerIds.length
      ? await db.offer.findMany({
          where: { id: { in: offerIds } },
          select: { id: true, title: true, category: { select: { name: true } } },
        })
      : [];
    const offerMap = new Map(offers.map((o) => [o.id, o]));

    const topOffers = offerGroups.slice(0, 5).map((g) => ({
      id: g.offerId,
      title: offerMap.get(g.offerId)?.title ?? "(removed offer)",
      clicks: g._count._all,
    }));

    const categoryCounts = new Map<string, number>();
    for (const g of offerGroups) {
      const name = offerMap.get(g.offerId)?.category?.name ?? "Uncategorized";
      categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + g._count._all);
    }
    const topCategories = Array.from(categoryCounts.entries())
      .map(([category, c]) => ({ category, clicks: c }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    return {
      windowDays,
      clicks,
      views,
      ctr: views > 0 ? Number((clicks / views).toFixed(3)) : null,
      activeOffers,
      users,
      today: {
        clicks: todayClicks,
        completions: todayCompletions,
        conversionRate:
          todayClicks > 0 ? Number((todayCompletions / todayClicks).toFixed(3)) : null,
      },
      estProviderRevenue: Number(revenueAgg._sum.payout ?? 0),
      totalCreditsIssued: creditsAgg._sum.credits ?? 0,
      pendingCredits: pendingAgg._sum.credits ?? 0,
      topOffers,
      topCountries: countryGroups.map((g) => ({
        country: g.country ?? "??",
        clicks: g._count._all,
      })),
      topCategories,
    };
  },
};
