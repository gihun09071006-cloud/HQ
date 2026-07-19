import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pages: number;
  searchParams: Record<string, string | string[] | undefined>;
}

export function Pagination({ page, pages, searchParams }: PaginationProps) {
  if (pages <= 1) return null;

  function href(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (v) params.set(key, v);
    }
    if (target > 1) params.set("page", String(target));
    else params.delete("page");
    const qs = params.toString();
    return `/offers${qs ? `?${qs}` : ""}`;
  }

  return (
    <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
      <Link
        href={href(page - 1)}
        aria-disabled={page <= 1}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          page <= 1 && "pointer-events-none opacity-40",
        )}
      >
        Previous
      </Link>
      <span className="font-mono text-xs text-muted-foreground">
        Page {page} of {pages}
      </span>
      <Link
        href={href(page + 1)}
        aria-disabled={page >= pages}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          page >= pages && "pointer-events-none opacity-40",
        )}
      >
        Next
      </Link>
    </nav>
  );
}
