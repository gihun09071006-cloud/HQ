import { ArrowUpRight, BadgeCheck, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FavoriteButton } from "@/components/offer/FavoriteButton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn, countryFlag, DEVICE_LABELS, formatMinutes, formatReward } from "@/lib/utils";
import type { OfferDTO } from "@/types/offer";

interface OfferCardProps {
  offer: OfferDTO;
  favorited?: boolean;
}

export function OfferCard({ offer, favorited = false }: OfferCardProps) {
  const flags = offer.countries.slice(0, 3);
  const extraCountries = offer.countries.length - flags.length;

  return (
    <article className="group relative flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40">
      {/* Whole-card link (interactive children sit above at z-10). */}
      <Link
        href={`/offers/${offer.id}`}
        className="absolute inset-0 rounded-lg"
        aria-label={offer.title}
      />

      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex min-w-0 gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
            {offer.imageUrl ? (
              <Image
                src={offer.imageUrl}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
                unoptimized={offer.imageUrl.includes("picsum.photos")}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
                {offer.provider.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{offer.provider.name}</Badge>
              {offer.category && <Badge>{offer.category.name}</Badge>}
              {offer.isFeatured && <Badge variant="primary">Featured</Badge>}
            </div>
            <h3 className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">{offer.title}</h3>
          </div>
        </div>
        <FavoriteButton offerId={offer.id} initialFavorited={favorited} className="shrink-0" />
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {offer.estimatedMinutes != null && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatMinutes(offer.estimatedMinutes)}
          </span>
        )}
        {offer.approvalDays != null && (
          <span className="inline-flex items-center gap-1">
            <BadgeCheck className="h-3.5 w-3.5" />
            {offer.approvalDays}d approval
          </span>
        )}
        <span>{DEVICE_LABELS[offer.device]}</span>
        {flags.length > 0 ? (
          <span className="inline-flex items-center gap-0.5" title={offer.countries.join(", ")}>
            {flags.map((c) => (
              <span key={c}>{countryFlag(c)}</span>
            ))}
            {extraCountries > 0 && <span>+{extraCountries}</span>}
          </span>
        ) : (
          <span>🌐 Global</span>
        )}
      </div>

      <div className="relative z-10 mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="font-mono text-base font-semibold tracking-tight text-reward">
          {formatReward(offer.rewardAmount, offer.rewardCurrency)}
        </span>
        <Link
          href={`/go/${offer.id}`}
          rel="nofollow sponsored"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Start
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
