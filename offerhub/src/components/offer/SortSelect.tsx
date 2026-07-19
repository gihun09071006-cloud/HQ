"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SORTS = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "reward", label: "Highest reward" },
  { value: "featured", label: "Featured" },
] as const;

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "trending";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "trending") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    router.push(`/offers?${params.toString()}`, { scroll: false });
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-card px-2 text-sm focus-visible:border-primary/60 focus-visible:outline-none"
      aria-label="Sort offers"
    >
      {SORTS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
