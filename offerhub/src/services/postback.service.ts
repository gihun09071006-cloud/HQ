import { Prisma } from "@prisma/client";

import { CreditEngine } from "@/lib/CreditEngine";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logger";

const PROVIDER = "adgem";

/** Hold window (days) used when we can't resolve the offer's own approvalDays. */
const DEFAULT_HOLD_DAYS = 3;

/** Parsed, verified AdGem postback ready for processing. */
export interface AdGemPostback {
  transactionId: string;
  requestId: string | null;
  playerId: string;
  /** Provider event type, when the integration sends one ("reward" pays,
   * others don't). AdGem's live macro set has no such field for most
   * accounts — that's fine, non-rewarding events already carry payout=0
   * and get skipped on that basis. Kept optional for other providers. */
  conversionType: string | null;
  /** Provider player reward (virtual currency) — NOT used to size credits. */
  amount: number;
  /** Provider revenue (our payout) — sizes credits, persisted, never exposed. */
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
  | { status: "pending"; credits: number; completionId: string }
  | { status: "reversed"; credits: number; completionId: string }
  | { status: "rejected"; credits: number; completionId: string }
  | { status: "skipped"; completionId: string }
  | { status: "duplicate" }
  | { status: "unknown_player" }
  | { status: "ignored" };

export interface PostbackLogEntry {
  provider?: string;
  transactionId: string | null;
  playerId: string | null;
  rawQuery: string;
  verified: boolean;
  status: string;
  message?: string | null;
}

/** Persist an audit-log row for a postback hit. Best-effort. */
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
    console.error("[postback:log] failed to persist log", error);
  }
}

/** Shared, provider-sourced columns for an OfferCompletion row. */
function completionBase(pb: AdGemPostback, userId: string, offerId: string | null) {
  return {
    provider: PROVIDER,
    transactionId: pb.transactionId,
    requestId: pb.requestId,
    playerId: pb.playerId,
    userId,
    offerId,
    externalOfferId: pb.offerExternalId,
    offerName: pb.offerName,
    goalId: pb.goalId,
    goalName: pb.goalName,
    campaignId: pb.campaignId,
    country: pb.country,
    conversionType: pb.conversionType,
    rewardAmount: new Prisma.Decimal(pb.amount),
    payout: pb.payout != null ? new Prisma.Decimal(pb.payout) : null,
  };
}

/**
 * Steps 2–6 of the AdGem postback flow (verifier already checked by route).
 *
 * The rule is "never confirm value before the provider's approval window":
 * a reward completion is HELD as PENDING (pendingCredits), and a separate
 * confirmation pass moves it to CONFIRMED (spendable, ledger-backed) once
 * the hold elapses. A reversal cancels the held PENDING (REJECTED) or, in
 * the rare case it lands after confirmation, claws back the CONFIRMED amount
 * (REVERSED). Install / non-reward events pay nothing (SKIPPED).
 *
 * Credits are an internal, non-monetary unit — users are only ever granted
 * Credits, never money.
 */
export async function processAdGemPostback(pb: AdGemPostback): Promise<PostbackResult> {
  const logBase = {
    transactionId: pb.transactionId,
    playerId: pb.playerId,
    rawQuery: pb.rawQuery,
    verified: true,
  };

  // 2. Duplicate transaction? (idempotency guard; the unique index is the
  // real serialization point, this is just a fast path.)
  const existing = await db.offerCompletion.findUnique({
    where: { provider_transactionId: { provider: PROVIDER, transactionId: pb.transactionId } },
    select: { id: true },
  });
  if (existing) {
    logEvent("duplicate_transaction", { provider: PROVIDER, transactionId: pb.transactionId });
    await recordPostbackLog({ ...logBase, status: "duplicate" });
    return { status: "duplicate" };
  }

  // 3. Resolve the player (player_id == the {user_id} we injected at click).
  const user = await db.user.findUnique({ where: { id: pb.playerId }, select: { id: true } });
  if (!user) {
    logEvent("unknown_player", { provider: PROVIDER, playerId: pb.playerId, transactionId: pb.transactionId });
    await recordPostbackLog({ ...logBase, status: "unknown_player" });
    return { status: "unknown_player" };
  }

  // Resolve our own Offer row (best-effort; drives the hold window).
  const offer = pb.offerExternalId
    ? await db.offer.findFirst({
        where: { externalId: pb.offerExternalId, provider: { slug: PROVIDER } },
        select: { id: true, approvalDays: true },
      })
    : null;
  if (pb.offerExternalId && !offer) {
    logEvent("unknown_offer", { provider: PROVIDER, externalOfferId: pb.offerExternalId, transactionId: pb.transactionId });
  }

  const isReversal =
    (pb.payout != null && pb.payout < 0) || (pb.payout == null && pb.amount < 0);

  try {
    if (isReversal) return await handleReversal(pb, user.id, offer?.id ?? null, logBase);

    // Only reward events pay. AdGem install goals (and anything non-reward)
    // are tracking-only — record as SKIPPED, grant nothing.
    if (pb.conversionType && pb.conversionType.toLowerCase() !== "reward") {
      const c = await db.offerCompletion.create({
        data: { ...completionBase(pb, user.id, offer?.id ?? null), credits: 0, status: "SKIPPED" },
        select: { id: true },
      });
      await recordPostbackLog({ ...logBase, status: "skipped", message: `conversion_type=${pb.conversionType}` });
      return { status: "skipped", completionId: c.id };
    }

    return await handlePendingGrant(pb, user.id, offer, logBase);
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

/** Reward completion → held as PENDING (pendingCredits), no confirmed ledger yet. */
async function handlePendingGrant(
  pb: AdGemPostback,
  userId: string,
  offer: { id: string; approvalDays: number | null } | null,
  logBase: Omit<PostbackLogEntry, "status" | "message">,
): Promise<PostbackResult> {
  // Size from payout (our revenue) — provider virtual currency is ignored.
  const quote = CreditEngine.quote({ payoutUsd: pb.payout });
  if (quote.credits === 0) {
    const c = await db.offerCompletion.create({
      data: { ...completionBase(pb, userId, offer?.id ?? null), credits: 0, status: "SKIPPED" },
      select: { id: true },
    });
    await recordPostbackLog({ ...logBase, status: "ignored_zero_value" });
    return { status: "skipped", completionId: c.id };
  }

  const holdDays = offer?.approvalDays ?? DEFAULT_HOLD_DAYS;
  const holdUntil = new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000);

  const completionId = await db.$transaction(async (tx) => {
    const completion = await tx.offerCompletion.create({
      data: {
        ...completionBase(pb, userId, offer?.id ?? null),
        credits: quote.credits,
        ratioUsed: new Prisma.Decimal(quote.ratioUsed),
        creditsPerUsdUsed: quote.creditsPerUsdUsed,
        policyVersion: quote.policyVersion,
        approvalDays: holdDays,
        status: "PENDING",
        holdUntil,
      },
      select: { id: true },
    });
    // Held, not spendable. No CreditTransaction until confirmation.
    await tx.user.update({ where: { id: userId }, data: { pendingCredits: { increment: quote.credits } } });
    return completion.id;
  });

  logEvent("completion", {
    provider: PROVIDER,
    transactionId: pb.transactionId,
    userId,
    offerId: offer?.id ?? null,
    externalOfferId: pb.offerExternalId,
    credits: quote.credits,
    state: "pending",
    holdUntil: holdUntil.toISOString(),
  });
  await recordPostbackLog({ ...logBase, status: "pending", message: `+${quote.credits} pending` });
  return { status: "pending", credits: quote.credits, completionId };
}

/**
 * Reversal / chargeback. Finds the most recent still-live completion for this
 * player+offer and undoes exactly what it granted (using the ORIGINAL stored
 * credits, never a recompute):
 *   • PENDING original → cancel the hold (REJECTED, pendingCredits -= x)
 *   • CONFIRMED original → claw back spendable (REVERSED, credits -= x, ledger)
 * If no original is found, fall back to a recomputed confirmed deduction.
 */
async function handleReversal(
  pb: AdGemPostback,
  userId: string,
  offerId: string | null,
  logBase: Omit<PostbackLogEntry, "status" | "message">,
): Promise<PostbackResult> {
  const original = await db.offerCompletion.findFirst({
    where: {
      provider: PROVIDER,
      userId,
      status: { in: ["PENDING", "CONFIRMED"] },
      ...(pb.offerExternalId ? { externalOfferId: pb.offerExternalId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, credits: true, status: true, transactionId: true },
  });

  const reverseCredits = original
    ? original.credits
    : CreditEngine.compute({ payoutUsd: pb.payout != null ? Math.abs(pb.payout) : null });
  if (reverseCredits === 0) {
    const c = await db.offerCompletion.create({
      data: { ...completionBase(pb, userId, offerId), credits: 0, status: "REVERSED" },
      select: { id: true },
    });
    await recordPostbackLog({ ...logBase, status: "reversed", message: "nothing to reverse" });
    return { status: "reversed", credits: 0, completionId: c.id };
  }

  const cancelPending = original?.status === "PENDING";

  const result = await db.$transaction(async (tx) => {
    // Record the incoming reversal event as its own (idempotent) row.
    const rev = await tx.offerCompletion.create({
      data: {
        ...completionBase(pb, userId, offerId),
        credits: -reverseCredits,
        status: cancelPending ? "REJECTED" : "REVERSED",
        reversalOfTransactionId: original?.transactionId ?? null,
      },
      select: { id: true },
    });

    if (original) {
      await tx.offerCompletion.update({
        where: { id: original.id },
        data: { status: cancelPending ? "REJECTED" : "REVERSED" },
      });
    }

    if (cancelPending) {
      // Held credits were never confirmed → just release the hold. No ledger.
      await tx.user.update({ where: { id: userId }, data: { pendingCredits: { decrement: reverseCredits } } });
    } else {
      // Claw back confirmed, spendable credits → signed ledger entry.
      const before = (await tx.user.findUnique({ where: { id: userId }, select: { credits: true } }))!.credits;
      const updated = await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: reverseCredits } },
        select: { credits: true },
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -reverseCredits,
          balanceBefore: before,
          balanceAfter: updated.credits,
          reason: "offer_reversal",
          provider: PROVIDER,
          completionId: rev.id,
        },
      });
    }
    return { id: rev.id };
  });

  const state = cancelPending ? "rejected" : "reversed";
  logEvent("completion", {
    provider: PROVIDER,
    transactionId: pb.transactionId,
    userId,
    credits: -reverseCredits,
    state,
    matchedOriginal: original?.transactionId ?? null,
  });
  await recordPostbackLog({ ...logBase, status: state, message: `-${reverseCredits} credits (${state})` });
  return { status: state, credits: -reverseCredits, completionId: result.id };
}
