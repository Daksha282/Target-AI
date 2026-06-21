export function formatUnits(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatDays(n: number): string {
  if (!isFinite(n)) return "∞";
  return `${Math.round(n)} days`;
}

export function formatDemand(n: number): string {
  return `${n.toFixed(1)} units/day`;
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// "YYYY-MM-DD" → "Jun 15, 2026". Parsed as local midnight so the displayed day
// never drifts by a timezone offset.
export function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
