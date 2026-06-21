interface ReorderInput {
  onHand: number;
  onOrder: number;
  reorderPoint: number;
  add: number; // average daily demand
  cycleDays?: number;
}

export function reorderQuantity({
  onHand,
  onOrder,
  reorderPoint,
  add,
  cycleDays = 14,
}: ReorderInput): number {
  const target = reorderPoint + add * cycleDays;
  return Math.max(0, Math.round(target - (onHand + onOrder)));
}
