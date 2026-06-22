import { Router, Request, Response } from "express";
import type { SkuHealth, Role } from "../src/engine/types";
import { groqClient, GROQ_MODEL } from "./groqClient";

const router = Router();

function buildSystemPrompt(role: Role): string {
  const roleInstructions: Record<Role, string> = {
    analyst:
      "You are a senior inventory analyst. Provide diagnostic detail: explain WHY the SKU " +
      "is in its current risk state, what the demand trend and data quality reveal, and what " +
      "leading indicators a buyer should watch. Use precise inventory terminology.",
    planner:
      "You are a supply chain planner. Provide executable action: state the exact reorder " +
      "quantity from the payload, the urgency given days-of-supply vs lead time, and the " +
      "suggested timing. Be direct and operational — no background explanation.",
    executive:
      "You are briefing a retail executive. Give a risk/return summary: business impact if " +
      "no action is taken, brand or margin relevance, confidence level, and one recommended " +
      "action. No supply-chain jargon — plain business language only.",
  };

  return (
    `You are an AI inventory advisor for Target Corporation. Your role for this response: ${role}.\n\n` +
    `${roleInstructions[role]}\n\n` +
    `STRICT RULES — violating any rule makes your response unusable:\n` +
    `1. Use ONLY the numbers present in the skuHealth JSON payload. Do not calculate, ` +
    `   recompute, or invent any figure. If a value is not in the payload, do not mention it.\n` +
    `2. You MUST mention the confidence level and data quality in your response.\n` +
    `3. Respond in 3–5 sentences maximum. No bullet points, no headers.\n` +
    `4. Do not claim you performed any calculation — all numbers come from the payload.\n` +
    `5. This data is SIMULATED for a prototype demo. Do not present it as live production data.`
  );
}

const VALID_ROLES: Role[] = ["analyst", "planner", "executive"];

/**
 * Set-level Layer 2 boundary. The briefing summarizes the WHOLE filtered portfolio,
 * so the LLM receives a trimmed per-SKU summary (already rounded by the client) and
 * may sum reorderQty — but compute nothing else and invent no figure.
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

const BRIEF_SYSTEM_PROMPT =
  "You are a supply chain planner briefing leadership. Using ONLY the numbers provided, " +
  "write ONE paragraph (4-6 sentences) summarizing the at-risk inventory: how many SKUs " +
  "are low-stock, any pattern (owned-brand / long-lead / specific store), the total reorder " +
  "units needed (sum the reorderQty values given — do not compute anything else), and the " +
  "single highest-priority action. Mention overall data confidence. Do not invent numbers " +
  "not in the payload. Data is simulated.";

router.post("/brief", async (req: Request, res: Response): Promise<void> => {
  const { items } = req.body as { items: SkuHealthSummary[] };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items must be a non-empty array." });
    return;
  }

  try {
    const completion = await groqClient.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: BRIEF_SYSTEM_PROMPT },
        {
          role: "user",
          content:
            "Here is the at-risk inventory summary. Use ONLY these values:\n\n" +
            JSON.stringify(items, null, 2),
        },
      ],
      max_tokens: 350,
      temperature: 0.3,
    });

    const brief = completion.choices[0]?.message?.content ?? "";
    res.json({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `LLM call failed: ${message}` });
  }
});

router.post("/recommend", async (req: Request, res: Response): Promise<void> => {
  const { skuHealth, role } = req.body as { skuHealth: SkuHealth; role: Role };

  if (!skuHealth || !role) {
    res.status(400).json({ error: "Both skuHealth and role are required." });
    return;
  }

  if (!VALID_ROLES.includes(role)) {
    res
      .status(400)
      .json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
    return;
  }

  try {
    const completion = await groqClient.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt(role) },
        {
          role: "user",
          content:
            "Here is the full skuHealth payload. Use ONLY these values in your response:\n\n" +
            JSON.stringify(skuHealth, null, 2),
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const recommendation = completion.choices[0]?.message?.content ?? "";
    res.json({ recommendation, role });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `LLM call failed: ${message}` });
  }
});

export default router;
