import type { MetadataRoute } from "next";

import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/offers`, changeFrequency: "hourly", priority: 0.9 },
  ];

  try {
    const offers = await db.offer.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, updatedAt: true },
      orderBy: { trendScore: "desc" },
      take: 1000,
    });
    return [
      ...staticEntries,
      ...offers.map((o) => ({
        url: `${base}/offers/${o.id}`,
        lastModified: o.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // DB unreachable at build time → static entries only.
    return staticEntries;
  }
}
