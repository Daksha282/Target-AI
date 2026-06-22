import type { SkuHealth, Role } from "../engine/types";
import { buildRecommendationPayload } from "./promptBuilder";

export class RecommendationError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "RecommendationError";
  }
}

export interface RecommendationResult {
  recommendation: string;
  role: Role;
  /** CLO 3 guardrail: true when every figure in the prose traces to Layer 1 values. */
  grounded: boolean;
  /** Numbers stated in the prose that did not match any payload value (within ±1). */
  ungroundedNumbers: number[];
}

export async function getRecommendation(
  skuHealth: SkuHealth,
  role: Role
): Promise<RecommendationResult> {
  const payload = buildRecommendationPayload(skuHealth, role);

  const res = await fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { error?: string }).error ?? `Server error ${res.status}`;
    throw new RecommendationError(message, res.status);
  }

  const data = (await res.json()) as Partial<RecommendationResult> & {
    recommendation: string;
  };
  return {
    recommendation: data.recommendation,
    role,
    grounded: data.grounded ?? true,
    ungroundedNumbers: data.ungroundedNumbers ?? [],
  };
}
