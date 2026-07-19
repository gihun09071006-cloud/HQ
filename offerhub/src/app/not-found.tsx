import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page flex flex-col items-center py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        This offer wandered off
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        It may have expired or been removed by the provider. The index refreshes constantly —
        there&apos;s plenty more.
      </p>
      <Link href="/offers" className={`${buttonVariants()} mt-6`}>
        Browse live offers
      </Link>
    </div>
  );
}
