import type { DataQuality } from "../engine/types";

interface Props {
  quality: DataQuality;
  reason: string;
}

export function DataQualityFlag({ quality, reason }: Props) {
  if (quality === "high") return null;

  return (
    <div className={`dq-flag dq-${quality}`}>
      <span className="dq-icon">⚠</span>
      <span>
        <strong>Data quality: {quality}</strong> — {reason}
      </span>
    </div>
  );
}
