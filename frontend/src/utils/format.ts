export function formatMoney(amount: string | number | null | undefined, currency = 'USD') {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function billingLabel(type: string) {
  if (type === 'ONE_TIME') return 'One-time';
  if (type === 'RECURRING') return 'Monthly';
  if (type === 'PROJECT') return 'Project';
  if (type === 'CUSTOM') return 'Custom';
  return type.replaceAll('_', ' ');
}

export function priceLabel(service: {
  billingType: string;
  price: string;
  monthlyPrice: string | null;
  setupFee: string;
  currency: string;
}) {
  if (service.billingType === 'RECURRING') {
    const monthly = formatMoney(service.monthlyPrice || 0, service.currency);
    const setup = Number(service.setupFee) > 0 ? ` + ${formatMoney(service.setupFee, service.currency)} setup` : '';
    return `${monthly}/mo${setup}`;
  }
  if (service.billingType === 'CUSTOM' && Number(service.price) <= 0) return 'Custom quote';
  return formatMoney(service.price, service.currency);
}

export function statusLabel(status: string) {
  return status.replaceAll('_', ' ');
}

export const siteUrl = import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
