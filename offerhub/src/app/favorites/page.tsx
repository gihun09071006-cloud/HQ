import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OfferGrid } from "@/components/offer/OfferGrid";
import { getServerAuthSession } from "@/lib/auth";
import { engagementService } from "@/services/engagement.service";

export const metadata: Metadata = { title: "Favorites" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/signin");

  const offers = await engagementService.getFavorites(session.user.id);

  return (
    <div className="page py-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Favorites</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {offers.length ? `${offers.length} saved offer${offers.length === 1 ? "" : "s"}` : "Offers you save show up here."}
      </p>
      <div className="mt-6">
        <OfferGrid
          offers={offers}
          favoritedIds={new Set(offers.map((o) => o.id))}
          emptyHint="Tap the heart on any offer to save it for later."
        />
      </div>
    </div>
  );
}
