interface Props {
  dataQuality: string;
  reason: string;
}

// Data quality is decided in Layer 1; this flag only surfaces a warning for
// medium/low coverage. High quality renders nothing.
export function DataQualityFlag({ dataQuality, reason }: Props) {
  if (dataQuality !== "medium" && dataQuality !== "low") return null;

  return (
    <div className={`dq-flag dq-${dataQuality}`}>
      <span className="dq-icon">⚠</span>
      <span>
        <strong>Data quality: {dataQuality}</strong> — {reason}
      </span>
    </div>
  );
}
