import type { SkuHealth, Role } from "../engine/types";

/**
 * Layer 2 boundary: this function constructs the payload that crosses from
 * Layer 1 (deterministic engine) to Layer 2 (LLM prose generation).
 *
 * The payload contains ONLY Layer 1 computed values — the LLM receives
 * pre-computed numbers and must not recalculate or invent any figure.
 * Role-tailoring happens on the server side via the system prompt.
 */
export function buildRecommendationPayload(
  skuHealth: SkuHealth,
  role: Role
): { skuHealth: SkuHealth; role: Role } {
  return { skuHealth, role };
}
