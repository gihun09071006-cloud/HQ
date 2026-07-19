import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { getServerAuthSession } from "@/lib/auth";
import { formatCredits, timeAgo } from "@/lib/utils";
import { engagementService } from "@/services/engagement.service";

export const metadata: Metadata = { title: "History" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/signin");

  const items = await engagementService.getHistory(session.user.id);

  return (
    <div className="page py-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Recently viewed</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your last {items.length} offer views.</p>

      {items.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Offers you open will appear here.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
          {items.map(({ offer, viewedAt }, i) => (
            <li key={`${offer.id}-${i}`}>
              <Link
                href={`/offers/${offer.id}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                  {offer.imageUrl && (
                    <Image
                      src={offer.imageUrl}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized={offer.imageUrl.includes("picsum.photos")}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{offer.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{offer.provider.name}</Badge>
                    <span>{timeAgo(viewedAt)}</span>
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold text-reward">
                  {formatCredits(offer.hqCredits)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
