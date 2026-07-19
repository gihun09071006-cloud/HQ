import { db } from "@/lib/db";

export const providerRepository = {
  list() {
    return db.offerProvider.findMany({ orderBy: { createdAt: "asc" } });
  },

  /** Guarantee a DB row exists for a registered adapter. */
  ensure(slug: string, name: string) {
    return db.offerProvider.upsert({
      where: { slug },
      create: { slug, name },
      update: { name },
    });
  },

  markSyncSuccess(id: string, count: number) {
    return db.offerProvider.update({
      where: { id },
      data: { status: "ACTIVE", lastSyncAt: new Date(), lastSyncCount: count, lastError: null },
    });
  },

  markSyncError(id: string, error: string) {
    return db.offerProvider.update({
      where: { id },
      data: { status: "ERROR", lastSyncAt: new Date(), lastError: error.slice(0, 2000) },
    });
  },
};
