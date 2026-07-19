"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import type { CategoryWithCount, CountryWithCount } from "@/types/offer";

interface OfferFiltersProps {
  categories: CategoryWithCount[];
  countries: CountryWithCount[];
}

const DEVICES = [
  { value: "", label: "All" },
  { value: "ANDROID", label: "Android" },
  { value: "IOS", label: "iOS" },
  { value: "WEB", label: "Web" },
] as const;

const MIN_REWARDS = [
  { value: "", label: "Any" },
  { value: "1", label: "$1+" },
  { value: "5", label: "$5+" },
  { value: "10", label: "$10+" },
  { value: "25", label: "$25+" },
] as const;

export function OfferFilters({ categories, countries }: OfferFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/offers?${params.toString()}`, { scroll: false });
  }

  const active = {
    device: searchParams.get("device") ?? "",
    category: searchParams.get("category") ?? "",
    country: searchParams.get("country") ?? "",
    minReward: searchParams.get("minReward") ?? "",
  };
  const hasFilters = Object.values(active).some(Boolean) || Boolean(searchParams.get("q"));

  return (
    <aside className="space-y-6" aria-label="Offer filters">
      <FilterSection label="Device">
        <div className="flex flex-wrap gap-1.5">
          {DEVICES.map((d) => (
            <Chip
              key={d.value}
              active={active.device === d.value}
              onClick={() => setParam("device", d.value || null)}
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </FilterSection>

      <FilterSection label="Minimum reward">
        <div className="flex flex-wrap gap-1.5">
          {MIN_REWARDS.map((r) => (
            <Chip
              key={r.value}
              active={active.minReward === r.value}
              onClick={() => setParam("minReward", r.value || null)}
            >
              {r.label}
            </Chip>
          ))}
        </div>
      </FilterSection>

      <FilterSection label="Category">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!active.category} onClick={() => setParam("category", null)}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.slug}
              active={active.category === c.slug}
              onClick={() => setParam("category", c.slug)}
            >
              {c.name}
              <span className="ml-1 font-mono text-[10px] opacity-70">{c.count}</span>
            </Chip>
          ))}
        </div>
      </FilterSection>

      <FilterSection label="Country">
        <select
          value={active.country}
          onChange={(e) => setParam("country", e.target.value || null)}
          className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:border-primary/60 focus-visible:outline-none"
          aria-label="Filter by country"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.count})
            </option>
          ))}
        </select>
      </FilterSection>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push("/offers")}
          className="text-sm text-primary hover:underline"
        >
          Clear all filters
        </button>
      )}
    </aside>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
