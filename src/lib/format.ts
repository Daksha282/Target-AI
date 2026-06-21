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
