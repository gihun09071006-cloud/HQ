import { NextResponse, type NextRequest } from "next/server";

import { logEvent } from "@/lib/logger";
import { AdGemProvider } from "@/providers/adgem/AdGemProvider";
import { processAdGemPostback, recordPostbackLog } from "@/services/postback.service";

/**
 * AdGem server-to-server postback (conversion callback).
 *
 *   GET|POST /api/postback/adgem?player_id=&amount=&transaction_id=&offer_id=&payout=&verifier=
 *
 * Flow:
 *   1. verify the `verifier` HMAC signature
 *   2. reject duplicate transaction_id (idempotent)
 *   3. resolve player_id → our User
 *   4. store the offer completion
 *   5. grant HQ Credits (+ ledger)
 *   6. write an audit log
 *   7. return 200 OK
 *
 * Register the URL below in the AdGem dashboard (keep `verifier` LAST). Note
 * `conversion_type` — install/non-reward events must be excluded from paying:
 *   https://<host>/api/postback/adgem?player_id={player_id}&amount={amount}
 *     &transaction_id={transaction_id}&request_id={request_id}
 *     &conversion_type={conversion_type}&offer_id={offer_id}
 *     &offer_name={offer_name}&goal_id={goal_id}&goal_name={goal_name}
 *     &campaign_id={campaign_id}&country={country}&payout={payout}
 *     &verifier={verifier}
 */
export const dynamic = "force-dynamic";

async function handle(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const params = url.searchParams;
  const rawQuery = url.search.replace(/^\?/, "");

  const transactionId = params.get("transaction_id");
  const playerId = params.get("player_id");

  const provider = new AdGemProvider();

  // 1. Verifier — configuration + signature.
  if (!provider.isPostbackConfigured()) {
    console.error("[postback:adgem] ADGEM_POSTBACK_SECRET is not set");
    return NextResponse.json({ error: "postback not configured" }, { status: 500 });
  }
  if (!provider.verifyPostback(req.url)) {
    logEvent("verification_failed", { provider: "adgem", transactionId, playerId });
    await recordPostbackLog({
      transactionId,
      playerId,
      rawQuery,
      verified: false,
      status: "invalid_verifier",
      message: "verifier mismatch",
    });
    return NextResponse.json({ error: "invalid verifier" }, { status: 403 });
  }

  // Guard: verified requests should always carry these, but be defensive.
  if (!transactionId || !playerId) {
    await recordPostbackLog({
      transactionId,
      playerId,
      rawQuery,
      verified: true,
      status: "bad_request",
      message: "missing transaction_id or player_id",
    });
    return NextResponse.json(
      { error: "missing transaction_id or player_id" },
      { status: 400 },
    );
  }

  const amount = Number(params.get("amount"));
  const payoutRaw = params.get("payout");
  const payout = payoutRaw && payoutRaw.trim() !== "" ? Number(payoutRaw) : null;

  // 2–6 handled by the service.
  const result = await processAdGemPostback({
    transactionId,
    requestId: params.get("request_id"),
    playerId,
    conversionType: params.get("conversion_type"),
    amount: Number.isFinite(amount) ? amount : 0,
    payout: payout != null && Number.isFinite(payout) ? payout : null,
    offerExternalId: params.get("offer_id"),
    offerName: params.get("offer_name"),
    goalId: params.get("goal_id"),
    goalName: params.get("goal_name"),
    campaignId: params.get("campaign_id"),
    country: params.get("country"),
    rawQuery,
  });

  // 7. Always ACK a processed postback with 200 — duplicate / unknown
  // player are permanent outcomes, not errors AdGem should retry.
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}
