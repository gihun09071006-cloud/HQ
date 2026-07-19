/**
 * Minimal structured logger. Emits one JSON line per event to stdout so
 * logs stay greppable and machine-parseable in any host (Vercel, Docker,
 * etc.) without pulling in a logging dependency at MVP scale.
 *
 * Never pass secrets (API keys, postback keys, verifiers) or raw provider
 * economics that must not be persisted in clear logs — hash or omit them
 * at the call site.
 */
export type LogEvent =
  | "click"
  | "completion"
  | "verification_failed"
  | "duplicate_transaction"
  | "unknown_player"
  | "unknown_offer"
  | "provider_failure";

type Level = "info" | "warn" | "error";

const LEVELS: Record<LogEvent, Level> = {
  click: "info",
  completion: "info",
  verification_failed: "warn",
  duplicate_transaction: "info",
  unknown_player: "warn",
  unknown_offer: "warn",
  provider_failure: "error",
};

export function logEvent(event: LogEvent, data: Record<string, unknown> = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level: LEVELS[event],
    event,
    ...data,
  });
  const level = LEVELS[event];
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
