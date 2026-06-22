import type { SkuHealth } from "../src/engine/types";

/**
 * CLO 3 governance guardrail. The LLM is told to use ONLY Layer 1's numbers, but a
 * prompt is not a guarantee. After the model responds we VERIFY: every numeric token
 * it states must trace back to a value in the payload we sent. We never block or
 * rewrite the output — we only FLAG, so a hallucinated figure is visible, not hidden.
 */
export interface GroundingResult {
  grounded: boolean;
  ungroundedNumbers: number[];
}

/** A stated number counts as grounded if it lands within ±1 of an allowed value. */
const TOLERANCE = 1;

const MONTHS =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|" +
  "Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
// "Jun 25, 2026" / "August 1, 2026" — projected dates are computed by Layer 1, but
// their day/year digits are not inventory figures, so they must not be extracted.
const DATE_RE = new RegExp(`\\b(?:${MONTHS})\\s+\\d{1,2},?\\s+\\d{4}\\b`, "gi");
const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;
// "25%" / "25 %" — the trend figure is reported as a percent and excluded by design.
const PERCENT_RE = /\d+(?:\.\d+)?\s*%/g;
const NUMBER_RE = /\d+(?:\.\d+)?/g;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The set of numbers the LLM is permitted to state, taken from the payload sent:
 * onHand, onOrder, reorderPoint, reorderQty, daysOfSupply, averageDailyDemand,
 * leadTimeDays, and the trend figure (as both a fraction and a percent).
 * Non-finite values (e.g. daysOfSupply = Infinity) are dropped.
 */
export function buildAllowedNumbers(h: SkuHealth): number[] {
  const pct = h.demandTrend?.weeklyPctChange;
  const candidates: Array<number | undefined> = [
    h.inventoryRow?.onHand,
    h.inventoryRow?.onOrder,
    h.reorderPoint,
    h.inventoryRow?.reorderPoint,
    h.reorderQty,
    h.daysOfSupply,
    h.averageDailyDemand,
    h.sku?.leadTimeDays,
    pct, // fractional trend, e.g. 0.25
    typeof pct === "number" ? Math.abs(Math.round(pct * 100)) : undefined, // percent, e.g. 25
  ];
  return candidates
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
    .map((n) => Math.abs(n));
}

/**
 * Numeric tokens stated in the prose. The SKU name (which can contain digits like
 * "100ct" or "3-Wick"), formatted dates, and percent figures are removed first so
 * only genuine claimed quantities remain.
 */
export function extractNumbers(text: string, skuName?: string): number[] {
  let cleaned = text;
  if (skuName) cleaned = cleaned.replace(new RegExp(escapeRegex(skuName), "gi"), " ");
  cleaned = cleaned
    .replace(DATE_RE, " ")
    .replace(ISO_DATE_RE, " ")
    .replace(PERCENT_RE, " ");
  return (cleaned.match(NUMBER_RE) ?? []).map((m) => parseFloat(m));
}

/** Verify a recommendation's numbers against the payload it was generated from. */
export function checkGrounding(recommendation: string, h: SkuHealth): GroundingResult {
  const allowed = buildAllowedNumbers(h);
  const stated = extractNumbers(recommendation, h.sku?.name);

  const ungrounded = stated.filter(
    (n) => !allowed.some((a) => Math.abs(n - a) <= TOLERANCE)
  );
  // De-duplicate so a number repeated in prose and the Drivers line is listed once.
  const unique = [...new Set(ungrounded)];

  return { grounded: unique.length === 0, ungroundedNumbers: unique };
}
