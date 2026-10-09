export function formatCost(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 'Not reported';
  if (value === 0) return '$0.00';
  if (value < 0.000001) return '<$0.000001';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}
