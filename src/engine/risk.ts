import type { RiskClass } from "./types";

interface RiskInput {
  onHand: number;
  reorderPoint: number;
  daysOfSupply: number;
  leadTimeDays: number;
}

export function classifyRisk({
  onHand,
  reorderPoint,
  daysOfSupply,
  leadTimeDays,
}: RiskInput): RiskClass {
  if (onHand <= reorderPoint) return "low-stock";
  if (daysOfSupply > Math.max(60, leadTimeDays * 3)) return "excess";
  return "healthy";
}
