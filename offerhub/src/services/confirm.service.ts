import { db } from "@/lib/db";

/**
 * Move PENDING completions whose hold window has elapsed to CONFIRMED:
 * pendingCredits → credits (spendable), backed by a ledger row. Idempotent
 * and batched — re-checks status inside the transaction so concurrent runs
 * never double-confirm.
 *
 * This is the "confirm" half of the never-confirm-before-approval model. It
 * runs on the cron; a future version can additionally reconcile against the
 * provider's reporting API to REJECT invalid conversions before they confirm.
 */
export async function confirmDueCompletions(
  now: Date = new Date(),
  limit = 500,
): Promise<{ confirmed: number; credits: number }> {
  const due = await db.offerCompletion.findMany({
    where: { status: "PENDING", holdUntil: { lte: now } },
    select: { id: true, userId: true, credits: true, provider: true },
    orderBy: { holdUntil: "asc" },
    take: limit,
  });

  let confirmed = 0;
  let credits = 0;

  for (const c of due) {
    try {
      const applied = await db.$transaction(async (tx) => {
        // Re-read inside the tx: skip if another run already handled it.
        const fresh = await tx.offerCompletion.findUnique({
          where: { id: c.id },
          select: { status: true },
        });
        if (fresh?.status !== "PENDING") return 0;

        if (c.userId && c.credits > 0) {
          const before = (await tx.user.findUnique({
            where: { id: c.userId },
            select: { credits: true },
          }))!.credits;
          const updated = await tx.user.update({
            where: { id: c.userId },
            data: { pendingCredits: { decrement: c.credits }, credits: { increment: c.credits } },
            select: { credits: true },
          });
          await tx.creditTransaction.create({
            data: {
              userId: c.userId,
              amount: c.credits,
              balanceBefore: before,
              balanceAfter: updated.credits,
              reason: "offer_confirmed",
              provider: c.provider,
              completionId: c.id,
            },
          });
        }

        await tx.offerCompletion.update({
          where: { id: c.id },
          data: { status: "CONFIRMED", confirmedAt: now },
        });
        return c.userId && c.credits > 0 ? c.credits : 0;
      });

      if (applied > 0) {
        confirmed += 1;
        credits += applied;
      }
    } catch (error) {
      console.error("[confirm] failed for completion", c.id, error);
    }
  }

  return { confirmed, credits };
}
