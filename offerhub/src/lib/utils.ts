import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "$12.50", "$1,200" or "12.5 PTS" for non-USD reward currencies. */
export function formatReward(amount: number, currency = "USD"): string {
  const value = amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return currency === "USD" ? `$${value}` : `${value} ${currency}`;
}

/** HQ Credits label, e.g. "1,200 Credits". The only reward figure the
 * client is ever shown — never the provider reward or payout. */
export function formatCredits(credits: number): string {
  return `${Math.round(credits).toLocaleString("en-US")} Credits`;
}

/** ISO alpha-2 → emoji flag ("KR" → 🇰🇷). */
export function countryFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "🌐";
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** ISO alpha-2 → English region name, falling back to the code itself. */
export function regionName(code: string): string {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ??
      code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function timeAgo(date: Date | string): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));
  const labels = ["s", "m", "h", "d", "w", "mo", "y"];
  const steps = [60, 60, 24, 7, 4.345, 12];
  let value = seconds;
  let i = 0;
  while (i < steps.length && value >= steps[i]) {
    value = Math.floor(value / steps[i]);
    i += 1;
  }
  return `${value}${labels[i]} ago`;
}

export const DEVICE_LABELS: Record<string, string> = {
  ANDROID: "Android",
  IOS: "iOS",
  WEB: "Web",
  ALL: "All devices",
};
