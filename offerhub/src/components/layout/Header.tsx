import Link from "next/link";
import { Suspense } from "react";

import { AuthNav } from "@/components/layout/AuthNav";
import { SearchBar } from "@/components/search/SearchBar";
import { getServerAuthSession } from "@/lib/auth";

export async function Header() {
  const session = await getServerAuthSession();
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        image: session.user.image ?? null,
        role: session.user.role,
      }
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="page flex h-14 items-center gap-5">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold tracking-tight">
            Offer<span className="text-primary">Hub</span>
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
            beta
          </span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
          <Link href="/offers" className="transition-colors hover:text-foreground">
            Browse
          </Link>
          <Link href="/offers?sort=trending" className="transition-colors hover:text-foreground">
            Trending
          </Link>
          <Link href="/offers?sort=newest" className="transition-colors hover:text-foreground">
            New
          </Link>
        </nav>

        <div className="ml-auto hidden w-64 lg:block">
          <Suspense>
            <SearchBar size="sm" />
          </Suspense>
        </div>

        <div className="ml-auto lg:ml-0">
          <AuthNav user={user} />
        </div>
      </div>
    </header>
  );
}
