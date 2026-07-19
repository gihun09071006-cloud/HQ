import { Flame, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { OfferGrid } from "@/components/offer/OfferGrid";
import { SearchBar } from "@/components/search/SearchBar";
import { countryFlag } from "@/lib/utils";
import { offerService } from "@/services/offer.service";

// Landing regenerates at most every 5 minutes (ISR) — fast and cheap.
export const revalidate = 300;

export default async function HomePage() {
  const { trending, topReward, newest, categories, countries, stats } =
    await offerService.landingData();

  return (
    <div className="page">
      {/* Hero: the product is a search engine, so the search box IS the hero. */}
      <section className="mx-auto max-w-2xl pb-14 pt-16 text-center sm:pt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Indexing {stats.providers} offerwall{stats.providers === 1 ? "" : "s"} · live
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Every Web3 offer.
          <br />
          One search.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
          Stop tab-hopping between offerwalls. OfferHub aggregates them into a single feed —
          compare rewards, filter by country and device, start the best offer first.
        </p>
        <div className="mt-8">
          <Suspense>
            <SearchBar size="lg" />
          </Suspense>
        </div>
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          <span className="text-reward">{stats.offers.toLocaleString()}</span> live offers ·{" "}
          {stats.providers} providers · {stats.countries} countries
        </p>
      </section>

      <Section
        icon={<Flame className="h-4 w-4 text-primary" />}
        title="Hot right now"
        href="/offers?sort=trending"
      >
        <OfferGrid offers={trending.items} />
      </Section>

      <Section
        icon={<TrendingUp className="h-4 w-4 text-primary" />}
        title="Highest rewards"
        href="/offers?sort=reward"
      >
        <OfferGrid offers={topReward.items} />
      </Section>

      <Section
        icon={<Sparkles className="h-4 w-4 text-primary" />}
        title="New this week"
        href="/offers?sort=newest"
      >
        <OfferGrid offers={newest.items} />
      </Section>

      {categories.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-lg font-semibold tracking-tight">Browse by category</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/offers?category=${c.slug}`}
                className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
              >
                <span className="text-sm font-medium">{c.name}</span>
                <span className="font-mono text-xs text-muted-foreground group-hover:text-primary">
                  {c.count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {countries.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-lg font-semibold tracking-tight">Top countries</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {countries.map((c) => (
              <Link
                key={c.code}
                href={`/offers?country=${c.code}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <span>{countryFlag(c.code)}</span>
                {c.name}
                <span className="font-mono text-[10px] opacity-70">{c.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  href,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14 first-of-type:mt-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          {icon}
          {title}
        </h2>
        <Link href={href} className="text-sm text-primary hover:underline">
          View all →
        </Link>
      </div>
      {children}
    </section>
  );
}
