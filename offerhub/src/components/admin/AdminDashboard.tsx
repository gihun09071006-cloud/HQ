"use client";

import { RefreshCw, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatCredits, timeAgo } from "@/lib/utils";
import type { AnalyticsSummary } from "@/services/analytics.service";
import type { OfferDTO } from "@/types/offer";

interface ProviderRow {
  id: string;
  slug: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ERROR";
  lastSyncAt: string | null;
  lastSyncCount: number;
  lastError: string | null;
}

interface AdminDashboardProps {
  analytics: AnalyticsSummary;
  providers: ProviderRow[];
  offers: OfferDTO[];
}

const STATUS_OPTIONS = ["ACTIVE", "DISABLED", "HIDDEN"] as const;

export function AdminDashboard({ analytics, providers, offers: initialOffers }: AdminDashboardProps) {
  const router = useRouter();
  const [offers, setOffers] = useState(initialOffers);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function syncNow() {
    setSyncing(true);
    try {
      await fetch("/api/admin/sync", { method: "POST" });
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  async function patchOffer(id: string, data: { status?: string; isFeatured?: boolean }) {
    setSavingId(id);
    const previous = offers;
    setOffers((rows) => rows.map((o) => (o.id === id ? { ...o, ...data } as OfferDTO : o)));
    try {
      const res = await fetch(`/api/admin/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
    } catch {
      setOffers(previous);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-10">
      {/* Real-time "today" KPIs */}
      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Today (live)
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Clicks today" value={analytics.today.clicks.toLocaleString()} />
          <Stat label="Completions today" value={analytics.today.completions.toLocaleString()} />
          <Stat
            label="Conv. rate"
            value={
              analytics.today.conversionRate != null
                ? `${(analytics.today.conversionRate * 100).toFixed(1)}%`
                : "—"
            }
          />
          <Stat
            label="Est. provider revenue"
            value={`$${analytics.estProviderRevenue.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          />
          <Stat label="HQ Credits issued" value={analytics.totalCreditsIssued.toLocaleString()} />
        </div>
      </section>

      {/* Window KPI cards */}
      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Last {analytics.windowDays} days
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Clicks" value={analytics.clicks.toLocaleString()} />
          <Stat label="Detail views" value={analytics.views.toLocaleString()} />
          <Stat
            label="CTR"
            value={analytics.ctr != null ? `${(analytics.ctr * 100).toFixed(1)}%` : "—"}
          />
          <Stat label="Active offers" value={analytics.activeOffers.toLocaleString()} />
          <Stat label="Users" value={analytics.users.toLocaleString()} />
        </div>
      </section>

      {/* Top lists */}
      <section className="grid gap-3 lg:grid-cols-3">
        <TopList
          title="Popular offers"
          rows={analytics.topOffers.map((o) => ({ label: o.title, value: o.clicks }))}
        />
        <TopList
          title="Top countries"
          rows={analytics.topCountries.map((c) => ({ label: c.country, value: c.clicks }))}
        />
        <TopList
          title="Top categories"
          rows={analytics.topCategories.map((c) => ({ label: c.category, value: c.clicks }))}
        />
      </section>

      {/* Providers */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Providers
          </h2>
          <Button size="sm" onClick={syncNow} disabled={syncing}>
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync all now"}
          </Button>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Provider</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Last sync</th>
                <th className="px-4 py-2.5 font-medium">Offers</th>
                <th className="px-4 py-2.5 font-medium">Last error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {providers.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={p.status === "ERROR" ? "reward" : p.status === "ACTIVE" ? "primary" : "default"}
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {p.lastSyncAt ? timeAgo(p.lastSyncAt) : "never"}
                  </td>
                  <td className="px-4 py-2.5 font-mono">{p.lastSyncCount}</td>
                  <td className="max-w-[280px] truncate px-4 py-2.5 text-xs text-muted-foreground" title={p.lastError ?? ""}>
                    {p.lastError ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Offer moderation */}
      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Offers (latest {offers.length})
        </h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Offer</th>
                <th className="px-4 py-2.5 font-medium">Provider</th>
                <th className="px-4 py-2.5 font-medium">Credits</th>
                <th className="px-4 py-2.5 font-medium">Clicks</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Featured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {offers.map((o) => (
                <tr key={o.id} className={cn(savingId === o.id && "opacity-60")}>
                  <td className="max-w-[320px] truncate px-4 py-2.5 font-medium" title={o.title}>
                    {o.title}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{o.provider.name}</td>
                  <td className="px-4 py-2.5 font-mono text-reward">
                    {formatCredits(o.hqCredits)}
                  </td>
                  <td className="px-4 py-2.5 font-mono">{o.clickCount}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={o.status === "EXPIRED" ? "DISABLED" : o.status}
                      disabled={o.status === "EXPIRED"}
                      onChange={(e) => patchOffer(o.id, { status: e.target.value })}
                      className="h-8 rounded-md border border-input bg-card px-2 text-xs focus-visible:outline-none"
                      aria-label={`Status for ${o.title}`}
                    >
                      {o.status === "EXPIRED" && <option>EXPIRED</option>}
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => patchOffer(o.id, { isFeatured: !o.isFeatured })}
                      aria-pressed={o.isFeatured}
                      aria-label={`Toggle featured for ${o.title}`}
                      className={cn(
                        "rounded-md p-1.5 transition-colors hover:bg-secondary",
                        o.isFeatured ? "text-reward" : "text-muted-foreground",
                      )}
                    >
                      <Star className="h-4 w-4" fill={o.isFeatured ? "currentColor" : "none"} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}

function TopList({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  return (
    <Card className="p-4">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r, i) => (
            <li key={`${r.label}-${i}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{r.label}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
