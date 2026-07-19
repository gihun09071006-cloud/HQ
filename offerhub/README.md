# OfferHub

**The Web3 offer search engine.** OfferHub aggregates offerwall networks (AdGem first; Torox, BitLabs, CPX, AyeT, RevU next) into a single searchable index. It is *not* a reward platform — no payouts, no points, no tokens. Users discover the best offer, click **Start**, and complete it on the provider's side. Revenue comes from tracked affiliate clicks.

> Think **Google Search for offerwalls**: crawl → normalize → rank → serve → redirect.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 + TypeScript (strict) |
| Styling | TailwindCSS + shadcn-style primitives, dark premium theme |
| Data | PostgreSQL + Prisma |
| Cache | Upstash Redis (optional — graceful no-op without it) |
| Auth | NextAuth v4 (Google / Discord / Email magic link), wallet login planned |
| Hosting | Vercel + Neon/Supabase Postgres + Upstash (all free tiers) |

## Quickstart

```bash
npm install
cp .env.example .env        # set DATABASE_URL + NEXTAUTH_SECRET at minimum
npm run db:push             # create schema
npm run db:seed             # categories, countries, providers + mock offers
npm run dev                 # http://localhost:3000
```

The **mock provider ("SampleWall")** ships 16 realistic offers, so the whole product — search, filters, ranking, click redirect, favorites, admin — works end-to-end with **zero API keys**.

### Minimum `.env`

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/offerhub"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="openssl rand -base64 32"
ADMIN_EMAILS="you@example.com"   # auto-promoted to ADMIN on sign-in
```

Everything else (OAuth, email, Redis, AdGem, cron) is optional and documented in `.env.example`.

## How data flows

```
┌─ providers/…  every network gets one adapter class
│    fetchOffers() → raw JSON → normalize() → NormalizedOffer
▼
sync.service.syncAll()          (cron / admin button / npm run sync)
│    upsert into unified Offer table (keyed provider+externalId)
│    offers missing from feed → EXPIRED, re-seen → ACTIVE
│    admin DISABLED/HIDDEN are never overwritten by sync
▼
ranking.service                 trendScore = clicks in last 72h
▼
offer.service (cached 60–120s) → pages + /api/offers
▼
/go/[id]                        records Click, fills {click_id}/{user_id}
                                macros, 302 → provider  ← revenue path
```

## Adding a provider (the whole point of the architecture)

1. Create `src/providers/<slug>/<Name>Provider.ts` extending `OfferProvider`.
2. Implement `isConfigured()`, `fetchOffers()`, `normalize(raw)` — map the network's fields into `NormalizedOffer`. Shared helpers (`asNumber`, `mapDevice`, `mapCategory`, `mapCountries`) handle the annoying parts.
3. Add **one line** to `src/providers/registry.ts`.

Sync, ranking, search, UI and admin pick it up automatically. The AdGem adapter (`src/providers/adgem/`) is the reference implementation — **verify its field mapping against your AdGem publisher dashboard docs before going live**; wall API shapes vary by account.

## Key routes

| Route | Purpose |
|---|---|
| `/` | Landing: search hero, trending / top reward / new, categories, countries |
| `/offers` | Search + filters (device, category, country, min reward) + sort + pagination |
| `/offers/[id]` | Offer detail, JSON-LD, related offers |
| `/go/[id]` | Click tracking + macro substitution + 302 redirect (**revenue**) |
| `/signin`, `/favorites`, `/history` | Auth + user features |
| `/admin` | KPIs (clicks, views, CTR), provider health, sync button, offer moderation |
| `/api/offers` | Public search API (rate-limited) |
| `/api/cron/sync` | Sync endpoint — `Authorization: Bearer $CRON_SECRET` |

## Deploying (low-cost path)

1. **Postgres**: Neon or Supabase free tier → `DATABASE_URL`.
2. **Vercel**: import repo, add env vars. `vercel.json` schedules a daily sync (Hobby plan limit). For the spec's 30-minute cadence, point [cron-job.org](https://cron-job.org) (free) at `GET /api/cron/sync` with the Bearer header.
3. **Upstash Redis** (optional): set the two REST env vars — list/landing caches switch on automatically.
4. Set `ADMIN_EMAILS`, sign in, open `/admin`, hit **Sync all now**.

## Security posture

- Zod validation on every query/body input; strict TypeScript everywhere.
- Rate limiting on public APIs and the redirect route (in-memory fixed window; swap in `@upstash/ratelimit` when you scale to multi-instance).
- Security headers via `next.config.mjs` (nosniff, frame-deny, referrer policy).
- Admin routes double-checked server-side (`role === "ADMIN"`), never trusting the client.
- No secrets in the client bundle; provider keys live server-side only.

## Roadmap (from the product spec — intentionally *not* built yet)

Guild/DAO system · gamification (XP, badges, leaderboards) · AI offer recommendations · referral program · wallet login (UI stub exists) · multi-language · mobile app · advertiser self-serve dashboard. The schema and service layer were shaped so these bolt on without rewrites (e.g. `User.walletAddress` already exists, `Click` is the analytics substrate).
