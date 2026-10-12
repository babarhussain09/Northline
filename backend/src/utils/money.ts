export function formatMoney(amount: { toString(): string } | number | string, currency = 'USD') {
  const value = typeof amount === 'number' ? amount : Number(amount.toString());
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}
