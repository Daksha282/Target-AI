import type { Confidence } from "../engine/types";

interface Props {
  confidence: Confidence;
}

// Confidence is computed entirely in the Layer 1 engine; this badge only colors it.
const classByLevel: Record<Confidence, string> = {
  High: "badge badge-high",
  Medium: "badge badge-medium",
  Low: "badge badge-low",
};

export function ConfidenceBadge({ confidence }: Props) {
  return <span className={classByLevel[confidence]}>Confidence: {confidence}</span>;
}
