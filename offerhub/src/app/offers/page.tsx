import type { Metadata } from "next";
import { Suspense } from "react";

import { OfferFilters } from "@/components/offer/OfferFilters";
import { OfferGrid } from "@/components/offer/OfferGrid";
import { Pagination } from "@/components/offer/Pagination";
import { SortSelect } from "@/components/offer/SortSelect";
import { SearchBar } from "@/components/search/SearchBar";
import { getServerAuthSession } from "@/lib/auth";
import { parseOfferQuery } from "@/lib/validation";
import { engagementService } from "@/services/engagement.service";
import { offerService } from "@/services/offer.service";

export const metadata: Metadata = {
  title: "Browse offers",
  description:
    "Search and filter every aggregated Web3 offer by category, country, device and reward.",
};

export const dynamic = "force-dynamic";

interface BrowsePageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const query = parseOfferQuery(searchParams);

  const [result, categories, countries, session] = await Promise.all([
    offerService.list(query),
    offerService.categoriesWithCounts(),
    offerService.countriesWithCounts(),
    getServerAuthSession(),
  ]);

  const favoritedIds = session?.user
    ? await engagementService.getFavoriteIdSet(
        session.user.id,
        result.items.map((o) => o.id),
      )
    : undefined;

  return (
    <div className="page py-8">
      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
        <Suspense>
          <OfferFilters categories={categories} countries={countries} />
        </Suspense>

        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Suspense>
              <SearchBar size="sm" className="flex-1" />
            </Suspense>
            <Suspense>
              <SortSelect />
            </Suspense>
          </div>

          <p className="mt-3 font-mono text-xs text-muted-foreground" aria-live="polite">
            {result.total.toLocaleString()} offer{result.total === 1 ? "" : "s"}
            {query.q ? ` for “${query.q}”` : ""}
          </p>

          <div className="mt-4">
            <OfferGrid offers={result.items} favoritedIds={favoritedIds} />
          </div>

          <Pagination page={result.page} pages={result.pages} searchParams={searchParams} />
        </div>
      </div>
    </div>
  );
}
