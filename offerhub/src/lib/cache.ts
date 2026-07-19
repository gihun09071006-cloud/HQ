import { Redis } from "@upstash/redis";

/**
 * Optional read-through cache. If Upstash env vars are missing the app
 * runs uncached — zero extra infra required for local dev, near-zero
 * cost (free tier) in production. Entries are short-TTL only, so we
 * never need explicit invalidation.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  if (!redis) return fn();
  try {
    const hit = await redis.get<T>(key);
    if (hit !== null && hit !== undefined) return hit;
  } catch {
    // Cache read failure must never break a request.
  }
  const value = await fn();
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Cache write failure is also non-fatal.
  }
  return value;
}
