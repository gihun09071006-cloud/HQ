/**
 * Credit Engine — the single, provider-independent place that decides how
 * many HQ Credits a reward is worth.
 *
 * HQ Credits are an INTERNAL, NON-MONETARY unit (see /PRINCIPLES.md): they
 * are not fiat currency, not the provider payout, and carry no fixed cash
 * value. Users are only ever granted Credits — HQ never pays users money.
 *
 * Design: every provider adapter normalizes its response to a common basis
 * (USD amounts). The engine sizes the Credit grant from the PROVIDER PAYOUT
 * (our revenue) times an internal generosity ratio, then a credits-per-USD
 * scale:
 *
 *     credits = round(payoutUsd × HQ_PAYOUT_RATIO × HQ_CREDITS_PER_USD)
 *
 * Basing the grant on payout (not on any provider's own "virtual currency")
 * keeps the engine identical for AdGem, Torox, BitLabs, CPX, … — no
 * per-provider branching and no dependency on whether a network has a
 * virtual-currency system. `HQ_PAYOUT_RATIO` is purely an internal knob for
 * how generous Credit grants are relative to revenue; it is NOT a cash
 * payout ratio and never leaves the server.
 *
 * When only a user-facing reward value is known (a provider without a payout
 * field), the adapter passes `rewardUsd` and the engine scales that directly.
 */

const DEFAULT_CREDITS_PER_USD = 100;
const DEFAULT_PAYOUT_RATIO = 0.7;

export interface RewardBasis {
  /** Provider payout / our revenue in USD — the preferred basis. */
  payoutUsd?: number | null;
  /** Fallback user-facing reward value in USD, when payout is unknown. */
  rewardUsd?: number | null;
}

function creditsPerUsd(): number {
  const v = Number(process.env.HQ_CREDITS_PER_USD);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_CREDITS_PER_USD;
}

function payoutRatio(): number {
  const v = Number(process.env.HQ_PAYOUT_RATIO);
  return Number.isFinite(v) && v > 0 && v <= 1 ? v : DEFAULT_PAYOUT_RATIO;
}

function finiteOrZero(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export const CreditEngine = {
  /** Active configuration (for admin display / debugging). */
  config() {
    return { creditsPerUsd: creditsPerUsd(), payoutRatio: payoutRatio() };
  },

  /**
   * Provider basis → whole-number HQ Credits (always ≥ 0).
   *
   * Prefers `payoutUsd` (our revenue × internal ratio); falls back to a
   * known user-facing `rewardUsd`. Reversals/deductions are handled by the
   * caller negating this value — the engine itself never returns negatives.
   */
  compute(basis: RewardBasis): number {
    const perUsd = creditsPerUsd();

    const payout = finiteOrZero(basis.payoutUsd);
    if (payout > 0) return Math.max(1, Math.round(payout * payoutRatio() * perUsd));

    const reward = finiteOrZero(basis.rewardUsd);
    if (reward > 0) return Math.max(1, Math.round(reward * perUsd));

    return 0;
  },
};
