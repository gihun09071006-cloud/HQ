import { SearchX } from "lucide-react";
import Link from "next/link";

import { OfferCard } from "@/components/offer/OfferCard";
import type { OfferDTO } from "@/types/offer";

interface OfferGridProps {
  offers: OfferDTO[];
  favoritedIds?: Set<string>;
  emptyHint?: string;
}

export function OfferGrid({ offers, favoritedIds, emptyHint }: OfferGridProps) {
  if (!offers.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <SearchX className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No offers match these filters</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {emptyHint ?? "Try a broader search or clear a filter."}
        </p>
        <Link href="/offers" className="mt-4 text-sm text-primary hover:underline">
          Reset all filters
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} favorited={favoritedIds?.has(offer.id)} />
      ))}
    </div>
  );
}
