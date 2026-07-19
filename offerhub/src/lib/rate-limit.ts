/**
 * Minimal fixed-window rate limiter. Per-instance memory — good enough
 * for an MVP on a single region. For multi-region scale, swap the Map
 * for @upstash/ratelimit without changing call sites.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}

// Opportunistic cleanup so the Map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  buckets.forEach((b, k) => {
    if (b.resetAt < now) buckets.delete(k);
  });
}, 60_000).unref?.();
