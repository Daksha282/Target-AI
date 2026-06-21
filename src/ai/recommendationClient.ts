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

export async function getRecommendation(
  skuHealth: SkuHealth,
  role: Role
): Promise<string> {
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

  const data = (await res.json()) as { recommendation: string; role: Role };
  return data.recommendation;
}
