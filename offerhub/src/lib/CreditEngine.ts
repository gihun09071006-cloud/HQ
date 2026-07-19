import crypto from "crypto";

/**
 * Credit Engine — the single source of truth for turning a provider reward
 * into HQ Credits.
 *
 * HQ Credits are an internal unit (see /PRINCIPLES.md): they are NOT USD and
 * NOT the provider payout. The base algorithm is:
 *
 *     credits = round(providerReward × multiplier × jitter)
 *
 * where `jitter ∈ [1 - jitterPct, 1 + jitterPct]`. The jitter defeats
 * back-calculation of the provider payout from a public credit figure.
 *
 * Crucially the jitter is **deterministic**, seeded by a stable key (the
 * provider offer id) rather than random per call. That guarantees:
 *   • the credits shown while browsing an offer equal the credits granted
 *     when that offer's postback lands (same seed → same factor), and
 *   • the figure never flickers between renders.
 * It still varies unpredictably from one offer to the next, which is what
 * actually frustrates reverse-engineering.
 *
 * The formula is intentionally swappable: bump `VERSION`, branch in
 * `compute()`, and no call site changes.
 */

export interface CreditFormula {
  /** Credits per unit of provider reward. */
  multiplier: number;
  /** ± fraction applied as deterministic jitter (0.1 = ±10%). */
  jitterPct: number;
}

const DEFAULT_MULTIPLIER = 100;
const DEFAULT_JITTER_PCT = 0.1;

export const CREDIT_ENGINE_VERSION = 1;

function currentFormula(): CreditFormula {
  const m = Number(process.env.HQ_CREDITS_PER_UNIT);
  const j = Number(process.env.HQ_CREDITS_JITTER_PCT);
  return {
    multiplier: Number.isFinite(m) && m > 0 ? m : DEFAULT_MULTIPLIER,
    jitterPct: Number.isFinite(j) && j >= 0 && j < 1 ? j : DEFAULT_JITTER_PCT,
  };
}

/** Deterministic factor in [1 - jitterPct, 1 + jitterPct] derived from `seed`. */
function jitterFactor(seed: string, jitterPct: number): number {
  if (jitterPct <= 0 || !seed) return 1;
  const digest = crypto.createHash("sha256").update(seed).digest();
  const unit = digest.readUInt32BE(0) / 0xffffffff; // [0, 1]
  const delta = (unit * 2 - 1) * jitterPct; // [-jitterPct, +jitterPct]
  return 1 + delta;
}

export const CreditEngine = {
  version: CREDIT_ENGINE_VERSION,

  /** The active formula (for admin display / debugging). */
  formula: currentFormula,

  /**
   * Convert a provider reward into HQ Credits.
   *
   * @param providerReward provider's user-facing reward, in their unit
   * @param seed stable key for the deterministic jitter — pass the provider
   *   offer id so browse-time and postback-time credits agree
   */
  compute(providerReward: number, seed: string): number {
    if (!Number.isFinite(providerReward) || providerReward <= 0) return 0;
    const { multiplier, jitterPct } = currentFormula();
    const raw = providerReward * multiplier * jitterFactor(seed, jitterPct);
    return Math.max(1, Math.round(raw));
  },
};
