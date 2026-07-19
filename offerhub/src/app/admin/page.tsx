import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getServerAuthSession } from "@/lib/auth";
import { offerRepository } from "@/repositories/offer.repository";
import { providerRepository } from "@/repositories/provider.repository";
import { analyticsService } from "@/services/analytics.service";
import { toOfferDTO } from "@/services/offer.service";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerAuthSession();
  if (session?.user?.role !== "ADMIN") redirect("/signin");

  const [analytics, providers, offerRows] = await Promise.all([
    analyticsService.summary(7),
    providerRepository.list(),
    offerRepository.adminList(100),
  ]);

  return (
    <div className="page py-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Provider health, click analytics and offer moderation.
      </p>
      <div className="mt-8">
        <AdminDashboard
          analytics={analytics}
          providers={providers.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            status: p.status,
            lastSyncAt: p.lastSyncAt?.toISOString() ?? null,
            lastSyncCount: p.lastSyncCount ?? 0,
            lastError: p.lastError,
          }))}
          offers={offerRows.map(toOfferDTO)}
        />
      </div>
    </div>
  );
}
