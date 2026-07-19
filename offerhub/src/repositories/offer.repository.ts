import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { regionName } from "@/lib/utils";
import type { OfferListQuery } from "@/lib/validation";
import type { NormalizedOffer } from "@/types/offer";

export const offerInclude = {
  provider: { select: { slug: true, name: true } },
  category: { select: { slug: true, name: true } },
  countries: { select: { countryCode: true } },
} satisfies Prisma.OfferInclude;

export type OfferWithRelations = Prisma.OfferGetPayload<{ include: typeof offerInclude }>;

export function buildOfferWhere(params: OfferListQuery): Prisma.OfferWhereInput {
  const and: Prisma.OfferWhereInput[] = [{ status: "ACTIVE" }];

  if (params.q) {
    and.push({
      OR: [
        { title: { contains: params.q, mode: "insensitive" } },
        { description: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }
  if (params.category) and.push({ category: { slug: params.category } });
  if (params.device && params.device !== "ALL") {
    and.push({ device: { in: [params.device, "ALL"] } });
  }
  if (params.country) {
    // Global offers (no country rows) match everywhere.
    and.push({
      OR: [
        { countries: { none: {} } },
        { countries: { some: { countryCode: params.country } } },
      ],
    });
  }
  if (params.minReward) and.push({ rewardAmount: { gte: params.minReward } });

  return { AND: and };
}

export const offerRepository = {
  findMany(
    where: Prisma.OfferWhereInput,
    orderBy: Prisma.OfferOrderByWithRelationInput[],
    skip: number,
    take: number,
  ) {
    return db.offer.findMany({ where, orderBy, skip, take, include: offerInclude });
  },

  count(where: Prisma.OfferWhereInput) {
    return db.offer.count({ where });
  },

  findById(id: string) {
    return db.offer.findUnique({ where: { id }, include: offerInclude });
  },

  findRelated(offerId: string, categoryId: string | null, take = 4) {
    return db.offer.findMany({
      where: {
        status: "ACTIVE",
        id: { not: offerId },
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: [{ trendScore: "desc" }, { rewardAmount: "desc" }],
      take,
      include: offerInclude,
    });
  },

  adminList(take = 100) {
    return db.offer.findMany({
      orderBy: { updatedAt: "desc" },
      take,
      include: offerInclude,
    });
  },

  update(id: string, data: Prisma.OfferUpdateInput) {
    return db.offer.update({ where: { id }, data, include: offerInclude });
  },

  /**
   * Pre-create every category up front (one query, duplicates ignored).
   * Offers are upserted concurrently and many share a category; without
   * this, two concurrent `connectOrCreate` for the same brand-new slug race
   * and one fails with a unique-constraint violation on Category.slug.
   */
  async ensureCategories(slugs: (string | null | undefined)[]) {
    const unique = Array.from(new Set(slugs.filter((s): s is string => Boolean(s))));
    if (!unique.length) return;
    await db.category.createMany({
      data: unique.map((slug) => ({
        slug,
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
      })),
      skipDuplicates: true,
    });
  },

  /** Idempotent upsert keyed on (providerId, externalId). */
  async upsertFromNormalized(providerId: string, offer: NormalizedOffer) {
    const categoryConnect = offer.categorySlug
      ? {
          connectOrCreate: {
            where: { slug: offer.categorySlug },
            create: {
              slug: offer.categorySlug,
              name: offer.categorySlug.charAt(0).toUpperCase() + offer.categorySlug.slice(1),
            },
          },
        }
      : undefined;

    const shared = {
      title: offer.title,
      description: offer.description ?? null,
      requirements: offer.requirements ?? null,
      imageUrl: offer.imageUrl ?? null,
      bannerUrl: offer.bannerUrl ?? null,
      url: offer.url,
      rewardAmount: offer.rewardAmount,
      rewardCurrency: offer.rewardCurrency,
      payout: offer.payout ?? null,
      device: offer.device,
      estimatedMinutes: offer.estimatedMinutes ?? null,
      approvalDays: offer.approvalDays ?? null,
      raw: (offer.raw ?? undefined) as Prisma.InputJsonValue | undefined,
      category: categoryConnect,
    };

    const row = await db.offer.upsert({
      where: { providerId_externalId: { providerId, externalId: offer.externalId } },
      create: {
        provider: { connect: { id: providerId } },
        externalId: offer.externalId,
        ...shared,
      },
      // NOTE: `status` is intentionally untouched here so that admin
      // DISABLED/HIDDEN decisions survive every sync.
      update: { ...shared, lastSeenAt: new Date() },
      select: { id: true },
    });

    // Refresh country targeting.
    const codes = Array.from(new Set(offer.countries));
    if (codes.length) {
      await db.country.createMany({
        data: codes.map((code) => ({ code, name: regionName(code) })),
        skipDuplicates: true,
      });
    }
    await db.offerCountry.deleteMany({ where: { offerId: row.id } });
    if (codes.length) {
      await db.offerCountry.createMany({
        data: codes.map((code) => ({ offerId: row.id, countryCode: code })),
        skipDuplicates: true,
      });
    }

    return row.id;
  },

  expireUnseen(providerId: string, seenBefore: Date) {
    return db.offer.updateMany({
      where: { providerId, status: "ACTIVE", lastSeenAt: { lt: seenBefore } },
      data: { status: "EXPIRED" },
    });
  },

  reviveReseen(providerId: string, seenSince: Date) {
    return db.offer.updateMany({
      where: { providerId, status: "EXPIRED", lastSeenAt: { gte: seenSince } },
      data: { status: "ACTIVE" },
    });
  },
};
