import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="page flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <p className="font-display text-base font-semibold tracking-tight">
            Offer<span className="text-primary">Hub</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            A search engine for Web3 offerwalls. OfferHub indexes third-party offers — rewards
            are defined, tracked and paid out by the destination platforms.
          </p>
        </div>
        <nav className="flex gap-10 text-sm">
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Explore
            </p>
            <Link href="/offers" className="block text-muted-foreground hover:text-foreground">
              All offers
            </Link>
            <Link
              href="/offers?sort=reward"
              className="block text-muted-foreground hover:text-foreground"
            >
              Highest rewards
            </Link>
            <Link
              href="/offers?sort=newest"
              className="block text-muted-foreground hover:text-foreground"
            >
              New offers
            </Link>
          </div>
        </nav>
      </div>
      <div className="border-t border-border py-4">
        <p className="page font-mono text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} OfferHub
        </p>
      </div>
    </footer>
  );
}
