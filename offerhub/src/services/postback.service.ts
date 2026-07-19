import { Prisma } from "@prisma/client";

import { CreditEngine } from "@/lib/CreditEngine";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logger";

const PROVIDER = "adgem";

/** Parsed, verified AdGem postback ready for processing. */
export interface AdGemPostback {
  transactionId: string;
  requestId: string | null;
  playerId: string;
  /** Provider player reward (virtual currency) — drives HQ Credits. */
  amount: number;
  /** Provider revenue (our payout) — persisted, never exposed. */
  payout: number | null;
  offerExternalId: string | null;
  offerName: string | null;
  goalId: string | null;
  goalName: string | null;
  campaignId: string | null;
  country: string | null;
  rawQuery: string;
}

export type PostbackResult =
  | { status: "ok"; credits: number; completionId: string }
  | { status: "duplicate" }
  | { status: "unknown_player" }
  | { status: "ignored_non_positive" };

export interface PostbackLogEntry {
  provider?: string;
  transactionId: string | null;
  playerId: string | null;
  rawQuery: string;
  verified: boolean;
  status: string;
  message?: string | null;
}

/** Step 6 — persist an audit-log row for a postback hit. Best-effort. */
export async function recordPostbackLog(entry: PostbackLogEntry): Promise<void> {
  try {
    await db.postbackLog.create({
      data: {
        provider: entry.provider ?? PROVIDER,
        transactionId: entry.transactionId,
        playerId: entry.playerId,
        rawQuery: entry.rawQuery,
        verified: entry.verified,
        status: entry.status,
        message: entry.message ?? null,
      },
    });
  } catch (error) {
    // Never let logging failure break the postback response.
    console.error("[postback:log] failed to persist log", error);
  }
}

/**
 * Steps 2–6 of the AdGem postback flow (the verifier is checked by the
 * route before we get here):
 *   2. transaction_id duplicate check (idempotency)
 *   3. player_id lookup (player_id == our User.id)
 *   4. persist the OfferCompletion
 *   5. grant HQ Credits (+ append-only ledger row)
 *   6. write the audit log + structured event
 *
 * Returns a terminal outcome; the caller always ACKs with 200 so AdGem
 * stops retrying (duplicate / unknown player are permanent, not errors).
 */
export async function processAdGemPostback(pb: AdGemPostback): Promise<PostbackResult> {
  const logBase = {
    transactionId: pb.transactionId,
    playerId: pb.playerId,
    rawQuery: pb.rawQuery,
    verified: true,
  };

  // 2. Duplicate transaction?
  const existing = await db.offerCompletion.findUnique({
    where: { provider_transactionId: { provider: PROVIDER, transactionId: pb.transactionId } },
    select: { id: true },
  });
  if (existing) {
    logEvent("duplicate_transaction", { provider: PROVIDER, transactionId: pb.transactionId });
    await recordPostbackLog({ ...logBase, status: "duplicate" });
    return { status: "duplicate" };
  }

  // 3. Resolve the player. `player_id` is the {user_id} macro we injected
  // at click time, i.e. our own User.id. Guests can never be credited.
  const user = await db.user.findUnique({ where: { id: pb.playerId }, select: { id: true } });
  if (!user) {
    logEvent("unknown_player", { provider: PROVIDER, playerId: pb.playerId, transactionId: pb.transactionId });
    await recordPostbackLog({ ...logBase, status: "unknown_player" });
    return { status: "unknown_player" };
  }

  // A reversal / non-positive amount grants nothing at MVP — just record it.
  if (!(pb.amount > 0)) {
    await recordPostbackLog({ ...logBase, status: "ignored_non_positive" });
    return { status: "ignored_non_positive" };
  }

  // HQ Credits, seeded by the provider offer id so the granted amount
  // matches what the user saw while browsing (same CreditEngine seed).
  const credits = CreditEngine.compute(pb.amount, pb.offerExternalId ?? pb.transactionId);

  // Best-effort resolve our own Offer row. Completions are still recorded
  // and credited even when the offer isn't in our catalogue.
  const offer = pb.offerExternalId
    ? await db.offer.findFirst({
        where: { externalId: pb.offerExternalId, provider: { slug: PROVIDER } },
        select: { id: true },
      })
    : null;
  if (pb.offerExternalId && !offer) {
    logEvent("unknown_offer", {
      provider: PROVIDER,
      externalOfferId: pb.offerExternalId,
      transactionId: pb.transactionId,
    });
  }

  try {
    // 4 + 5 atomically. The unique (provider, transactionId) constraint is
    // the real idempotency guard against concurrent duplicate postbacks.
    const completionId = await db.$transaction(async (tx) => {
      const completion = await tx.offerCompletion.create({
        data: {
          provider: PROVIDER,
          transactionId: pb.transactionId,
          requestId: pb.requestId,
          playerId: pb.playerId,
          userId: user.id,
          offerId: offer?.id ?? null,
          externalOfferId: pb.offerExternalId,
          offerName: pb.offerName,
          goalId: pb.goalId,
          goalName: pb.goalName,
          campaignId: pb.campaignId,
          country: pb.country,
          rewardAmount: new Prisma.Decimal(pb.amount),
          payout: pb.payout != null ? new Prisma.Decimal(pb.payout) : null,
          credits,
          status: "credited",
        },
        select: { id: true },
      });

      const updated = await tx.user.update({
        where: { id: user.id },
        data: { credits: { increment: credits } },
        select: { credits: true },
      });

      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          amount: credits,
          balanceAfter: updated.credits,
          reason: "offer_completion",
          provider: PROVIDER,
          completionId: completion.id,
        },
      });

      return completion.id;
    });

    logEvent("completion", {
      provider: PROVIDER,
      transactionId: pb.transactionId,
      userId: user.id,
      offerId: offer?.id ?? null,
      externalOfferId: pb.offerExternalId,
      credits,
    });
    await recordPostbackLog({ ...logBase, status: "ok", message: `+${credits} credits` });
    return { status: "ok", credits, completionId };
  } catch (error) {
    // Lost a race with a concurrent identical postback → treat as duplicate.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      logEvent("duplicate_transaction", { provider: PROVIDER, transactionId: pb.transactionId });
      await recordPostbackLog({ ...logBase, status: "duplicate" });
      return { status: "duplicate" };
    }
    throw error;
  }
}
