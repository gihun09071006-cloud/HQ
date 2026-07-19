"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface SearchBarProps {
  size?: "sm" | "lg";
  className?: string;
  autoFocus?: boolean;
}

/**
 * On /offers the search is realtime (350ms debounce, replace navigation
 * so back-button history stays clean). Everywhere else, Enter routes to
 * /offers?q=…
 */
export function SearchBar({ size = "sm", className, autoFocus }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const isBrowse = pathname === "/offers";

  useEffect(() => {
    if (!isBrowse) return;
    setValue(searchParams.get("q") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isBrowse]);

  function buildUrl(q: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    params.delete("page");
    const qs = params.toString();
    return `/offers${qs ? `?${qs}` : ""}`;
  }

  function onChange(q: string) {
    setValue(q);
    if (!isBrowse) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => router.replace(buildUrl(q), { scroll: false }), 350);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearTimeout(debounce.current);
    router.push(buildUrl(value.trim()));
  }

  return (
    <form role="search" onSubmit={onSubmit} className={cn("relative", className)}>
      <Search
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
          size === "lg" ? "h-5 w-5" : "h-4 w-4",
        )}
      />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={size === "lg" ? "Search offers, games, surveys, exchanges…" : "Search offers…"}
        className={cn(
          "w-full rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:outline-none",
          size === "lg" ? "h-12 pl-11 pr-4 text-base" : "h-9 pl-9 pr-3 text-sm",
        )}
        aria-label="Search offers"
      />
    </form>
  );
}
