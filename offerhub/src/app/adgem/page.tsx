import type { Metadata } from "next";
import Image from "next/image";

import { toPublicOffer } from "@/lib/credits";
import { countryFlag, DEVICE_LABELS, formatMinutes } from "@/lib/utils";
import { AdGemProvider } from "@/providers/adgem/AdGemProvider";
import type { PublicOffer } from "@/types/offer";

export const metadata: Metadata = {
  title: "AdGem — raw offers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type LoadResult =
  | { ok: true; items: PublicOffer[] }
  | { ok: false; error: string };

/**
 * Fetches live AdGem offers and normalizes them into the HQ Offer model.
 * Server-side only, nothing persisted, no mock data — the AdGem provider
 * is instantiated directly rather than through the registry (which also
 * carries the mock provider). Only HQ Credits reach this component.
 */
async function loadOffers(): Promise<LoadResult> {
  const provider = new AdGemProvider();
  if (!provider.isConfigured()) {
    return { ok: false, error: "AdGem is not configured. Set ADGEM_APP_ID in .env." };
  }
  try {
    const meta = { slug: provider.slug, name: provider.name };
    const offers = await provider.getNormalizedOffers();
    return { ok: true, items: offers.map((o) => toPublicOffer(o, meta)) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "AdGem fetch failed" };
  }
}

export default async function AdGemRawPage() {
  const result = await loadOffers();

  return (
    <div className="page py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">AdGem — raw offers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live from the official AdGem Offer API, normalized into the HQ Offer model.
          Not persisted. Rewards shown in HQ Credits only.
        </p>
      </header>

      {!result.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-medium">Could not load AdGem offers</p>
          <p className="mt-1 font-mono text-xs">{result.error}</p>
        </div>
      ) : result.items.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          The AdGem API returned no offers for this account.
        </p>
      ) : (
        <>
          <p className="mb-4 font-mono text-xs text-muted-foreground">
            {result.items.length} offer{result.items.length === 1 ? "" : "s"}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((offer) => (
              <li
                key={offer.externalId}
                className="flex flex-col rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    {offer.imageUrl ? (
                      <Image
                        src={offer.imageUrl}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
                        AG
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-sm font-medium leading-snug">{offer.title}</h2>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      #{offer.externalId}
                    </p>
                  </div>
                </div>

                {offer.description && (
                  <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">
                    {offer.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{DEVICE_LABELS[offer.device] ?? offer.device}</span>
                  {offer.categorySlug && <span>· {offer.categorySlug}</span>}
                  {offer.estimatedMinutes != null && (
                    <span>· {formatMinutes(offer.estimatedMinutes)}</span>
                  )}
                  {offer.approvalDays != null && <span>· {offer.approvalDays}d approval</span>}
                  {offer.countries.length > 0 ? (
                    <span title={offer.countries.join(", ")}>
                      · {offer.countries.slice(0, 3).map((c) => countryFlag(c)).join(" ")}
                      {offer.countries.length > 3 ? ` +${offer.countries.length - 3}` : ""}
                    </span>
                  ) : (
                    <span>· 🌐 Global</span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="font-mono text-base font-semibold tracking-tight text-reward">
                    {offer.credits.toLocaleString()} Credits
                  </span>
                  <a
                    href={offer.url}
                    target="_blank"
                    rel="nofollow sponsored noopener noreferrer"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open ↗
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
