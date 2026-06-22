import type { SkuHealth } from "../engine/types";
import { RecommendationError } from "./recommendationClient";

/**
 * Set-level Layer 2 boundary (mirrors buildRecommendationPayload, but for the whole
 * filtered portfolio). The server prompt is allowed to SUM reorderQty and nothing else,
 * so we send a trimmed, display-rounded summary of each SKU — the engine's values are
 * never mutated; we change presentation, not meaning.
 */
interface SkuHealthSummary {
  skuId: string;
  name: string;
  storeId: string;
  category: string;
  brandType: string;
  leadTimeDays: number;
  onHand: number;
  daysOfSupply: number;
  reorderQty: number;
  riskClass: string;
  confidence: string;
  dataQuality: string;
}

/** Round finite values to a whole number; pass non-finite (e.g. Infinity) through unchanged. */
function round0(n: number): number {
  return Number.isFinite(n) ? Math.round(n) : n;
}

function toSummary(h: SkuHealth): SkuHealthSummary {
  return {
    skuId: h.skuId,
    name: h.sku.name,
    storeId: h.storeId,
    category: h.sku.category,
    brandType: h.sku.brandType,
    leadTimeDays: h.sku.leadTimeDays,
    onHand: round0(h.inventoryRow.onHand),
    daysOfSupply: round0(h.daysOfSupply),
    reorderQty: round0(h.reorderQty),
    riskClass: h.riskClass,
    confidence: h.confidence,
    dataQuality: h.dataQuality,
  };
}

export async function getPortfolioBrief(items: SkuHealth[]): Promise<string> {
  const summary = items.map(toSummary);

  const res = await fetch("/api/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: summary }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { error?: string }).error ?? `Server error ${res.status}`;
    throw new RecommendationError(message, res.status);
  }

  const data = (await res.json()) as { brief: string };
  return data.brief;
}
