import { ArrowUpRight, BadgeCheck, Clock, MonitorSmartphone } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FavoriteButton } from "@/components/offer/FavoriteButton";
import { OfferGrid } from "@/components/offer/OfferGrid";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getServerAuthSession } from "@/lib/auth";
import { cn, countryFlag, DEVICE_LABELS, formatCredits, formatMinutes } from "@/lib/utils";
import { engagementService } from "@/services/engagement.service";
import { offerService } from "@/services/offer.service";

export const dynamic = "force-dynamic";

interface OfferPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: OfferPageProps): Promise<Metadata> {
  const offer = await offerService.getById(params.id);
  if (!offer || offer.status !== "ACTIVE") return { title: "Offer not found" };
  return {
    title: offer.title,
    description:
      offer.description ??
      `Earn ${formatCredits(offer.hqCredits)} via ${offer.provider.name}.`,
    openGraph: {
      title: offer.title,
      description: offer.description ?? undefined,
      images: offer.bannerUrl ?? offer.imageUrl ?? undefined,
    },
  };
}

export default async function OfferPage({ params }: OfferPageProps) {
  const offer = await offerService.getById(params.id);
  if (!offer || offer.status !== "ACTIVE") notFound();

  const session = await getServerAuthSession();
  let favorited = false;
  if (session?.user) {
    // Record "recently viewed" and resolve favorite state in parallel.
    const [ids] = await Promise.all([
      engagementService.getFavoriteIdSet(session.user.id, [offer.id]),
      engagementService.recordView(session.user.id, offer.id),
    ]);
    favorited = ids.has(offer.id);
  }

  const related = await offerService.getRelated(offer);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: offer.title,
    description: offer.description ?? undefined,
    // Reward is expressed in HQ Credits (an internal unit), so no monetary
    // price/priceCurrency is published here.
    availability: "https://schema.org/InStock",
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/offers/${offer.id}`,
  };

  return (
    <div className="page py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Banner */}
      <div className="relative h-40 overflow-hidden rounded-lg border border-border bg-card sm:h-52">
        {offer.bannerUrl ? (
          <Image
            src={offer.bannerUrl}
            alt=""
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
            unoptimized={offer.bannerUrl.includes("picsum.photos")}
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.15),transparent_60%)]" />
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div>
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
              {offer.imageUrl && (
                <Image
                  src={offer.imageUrl}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized={offer.imageUrl.includes("picsum.photos")}
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{offer.provider.name}</Badge>
                {offer.category && <Badge>{offer.category.name}</Badge>}
                {offer.isFeatured && <Badge variant="primary">Featured</Badge>}
              </div>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                {offer.title}
              </h1>
            </div>
          </div>

          {offer.description && (
            <section className="mt-8">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                About this offer
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {offer.description}
              </p>
            </section>
          )}

          {offer.requirements && (
            <section className="mt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Requirements
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {offer.requirements}
              </p>
            </section>
          )}
        </div>

        {/* Reward panel */}
        <aside className="h-fit rounded-lg border border-border bg-card p-5 lg:sticky lg:top-20">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Reward
          </p>
          <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-reward">
            {formatCredits(offer.hqCredits)}
          </p>

          <dl className="mt-5 space-y-2.5 text-sm">
            {offer.estimatedMinutes != null && (
              <MetaRow icon={<Clock className="h-4 w-4" />} label="Estimated time">
                {formatMinutes(offer.estimatedMinutes)}
              </MetaRow>
            )}
            {offer.approvalDays != null && (
              <MetaRow icon={<BadgeCheck className="h-4 w-4" />} label="Approval">
                ~{offer.approvalDays} day{offer.approvalDays === 1 ? "" : "s"}
              </MetaRow>
            )}
            <MetaRow icon={<MonitorSmartphone className="h-4 w-4" />} label="Device">
              {DEVICE_LABELS[offer.device]}
            </MetaRow>
          </dl>

          <div className="mt-5 border-t border-border pt-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Availability
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              {offer.countries.length ? (
                <span title={offer.countries.join(", ")}>
                  {offer.countries.slice(0, 8).map((c) => (
                    <span key={c} className="mr-1">
                      {countryFlag(c)}
                    </span>
                  ))}
                  {offer.countries.length > 8 && (
                    <span className="text-muted-foreground">
                      +{offer.countries.length - 8} more
                    </span>
                  )}
                </span>
              ) : (
                <span>🌐 Available worldwide</span>
              )}
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <Link
              href={`/go/${offer.id}`}
              rel="nofollow sponsored"
              className={cn(buttonVariants({ size: "lg" }), "flex-1")}
            >
              Start offer
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <FavoriteButton offerId={offer.id} initialFavorited={favorited} className="p-2.5" />
          </div>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
            Opens {offer.provider.name}. Reward is tracked and paid by the provider.
          </p>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">
            Similar offers
          </h2>
          <OfferGrid offers={related} />
        </section>
      )}
    </div>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
