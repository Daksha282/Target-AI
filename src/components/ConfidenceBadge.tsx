import type { Confidence } from "../engine/types";

interface Props {
  level: Confidence;
  reason?: string;
}

const colors: Record<Confidence, string> = {
  High: "badge badge-high",
  Medium: "badge badge-medium",
  Low: "badge badge-low",
};

export function ConfidenceBadge({ level, reason }: Props) {
  return (
    <span className={colors[level]} title={reason}>
      Confidence: {level}
    </span>
  );
}
