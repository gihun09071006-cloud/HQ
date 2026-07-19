import { cached } from "@/lib/cache";
import { db } from "@/lib/db";
import type { OfferListQuery } from "@/lib/validation";
import { buildOfferWhere, offerRepository, type OfferWithRelations } from "@/repositories/offer.repository";
import { orderByFor } from "@/services/ranking.service";
import type {
  CategoryWithCount,
  CountryWithCount,
  OfferDTO,
  OfferListResult,
} from "@/types/offer";

export function toOfferDTO(row: OfferWithRelations): OfferDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    requirements: row.requirements,
    imageUrl: row.imageUrl,
    bannerUrl: row.bannerUrl,
    rewardAmount: Number(row.rewardAmount),
    rewardCurrency: row.rewardCurrency,
    device: row.device,
    status: row.status,
    isFeatured: row.isFeatured,
    estimatedMinutes: row.estimatedMinutes,
    approvalDays: row.approvalDays,
    clickCount: row.clickCount,
    provider: row.provider,
    category: row.category,
    countries: row.countries.map((c) => c.countryCode),
    createdAt: row.createdAt.toISOString(),
  };
}

export const offerService = {
  async list(params: OfferListQuery): Promise<OfferListResult> {
    const key = `offers:list:${JSON.stringify(params)}`;
    return cached(key, 60, async () => {
      const where = buildOfferWhere(params);
      const skip = (params.page - 1) * params.pageSize;
      const [rows, total] = await Promise.all([
        offerRepository.findMany(where, orderByFor(params.sort), skip, params.pageSize),
        offerRepository.count(where),
      ]);
      return {
        items: rows.map(toOfferDTO),
        total,
        page: params.page,
        pageSize: params.pageSize,
        pages: Math.max(1, Math.ceil(total / params.pageSize)),
      };
    });
  },

  async getById(id: string): Promise<OfferDTO | null> {
    return cached(`offers:detail:${id}`, 60, async () => {
      const row = await offerRepository.findById(id);
      return row ? toOfferDTO(row) : null;
    });
  },

  async getRelated(offer: OfferDTO): Promise<OfferDTO[]> {
    const categoryId = offer.category
      ? (await db.category.findUnique({ where: { slug: offer.category.slug } }))?.id ?? null
      : null;
    const rows = await offerRepository.findRelated(offer.id, categoryId, 4);
    return rows.map(toOfferDTO);
  },

  async categoriesWithCounts(): Promise<CategoryWithCount[]> {
    return cached("offers:categories", 300, async () => {
      const rows = await db.category.findMany({
        include: {
          _count: { select: { offers: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { name: "asc" },
      });
      return rows
        .map((c) => ({ slug: c.slug, name: c.name, count: c._count.offers }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count);
    });
  },

  async countriesWithCounts(limit = 40): Promise<CountryWithCount[]> {
    return cached("offers:countries", 300, async () => {
      const rows = await db.country.findMany({
        include: {
          _count: {
            select: { offers: { where: { offer: { status: "ACTIVE" } } } },
          },
        },
      });
      return rows
        .map((c) => ({ code: c.code, name: c.name, count: c._count.offers }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    });
  },

  /** Everything the landing page needs, in one cached blob. */
  async landingData() {
    try {
      return await cached("landing:v1", 120, async () => {
        const base = { page: 1, pageSize: 8 } as const;
        const [trending, topReward, newest, categories, countries, stats] = await Promise.all([
          this.list({ ...baseQuery(), ...base, sort: "trending" }),
          this.list({ ...baseQuery(), ...base, sort: "reward" }),
          this.list({ ...baseQuery(), ...base, sort: "newest" }),
          this.categoriesWithCounts(),
          this.countriesWithCounts(12),
          landingStats(),
        ]);
        return { trending, topReward, newest, categories, countries, stats };
      });
    } catch (error) {
      // DB unreachable (e.g. static build before the first migration):
      // render the shell; ISR fills in real data on the next revalidate.
      console.warn("[landing] falling back to empty data:", error);
      const empty = { items: [], total: 0, page: 1, pageSize: 8, pages: 1 };
      return {
        trending: empty,
        topReward: empty,
        newest: empty,
        categories: [],
        countries: [],
        stats: { offers: 0, providers: 0, countries: 0 },
      };
    }
  },
};

function baseQuery() {
  return { sort: "trending" as const, page: 1, pageSize: 24 };
}

async function landingStats() {
  const [offers, providers, countries] = await Promise.all([
    db.offer.count({ where: { status: "ACTIVE" } }),
    db.offerProvider.count({ where: { status: { not: "PAUSED" } } }),
    db.country.count(),
  ]);
  return { offers, providers, countries };
}
