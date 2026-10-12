import { Prisma, type BillingType } from '@prisma/client';

export type PricedService = {
  billingType: BillingType;
  price: Prisma.Decimal | number | string;
  setupFee: Prisma.Decimal | number | string;
  monthlyPrice?: Prisma.Decimal | number | string | null;
  currency: string;
};

export function decimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

export function money(value: Prisma.Decimal.Value) {
  return decimal(value).toDecimalPlaces(2);
}

export function toCents(value: Prisma.Decimal.Value) {
  return money(value).mul(100).toDecimalPlaces(0).toNumber();
}

export type LinePrice = {
  unitPrice: Prisma.Decimal;
  setupFee: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  currency: string;
};

export function priceService(service: PricedService, quantity: number): LinePrice {
  const qty = decimal(quantity);
  const setupFee = money(service.setupFee ?? 0);
  let unitPrice = money(0);

  if (service.billingType === 'RECURRING') {
    unitPrice = money(service.monthlyPrice ?? 0);
  } else {
    unitPrice = money(service.price ?? 0);
  }

  const lineTotal = money(unitPrice.plus(setupFee).mul(qty));
  return { unitPrice, setupFee, lineTotal, currency: service.currency };
}

export function assertPurchasable(service: PricedService & { isActive: boolean; isPublished: boolean }) {
  if (!service.isActive || !service.isPublished) {
    return 'This service is not available for purchase.';
  }
  const priced = priceService(service, 1);
  if (priced.lineTotal.lessThanOrEqualTo(0)) {
    return 'This service does not have a purchase price yet. Book a demo and we will prepare a quote.';
  }
  if (service.billingType === 'RECURRING' && decimal(service.monthlyPrice ?? 0).lessThanOrEqualTo(0)) {
    return 'This subscription does not have a monthly price yet.';
  }
  return null;
}

export function sumMoney(values: Prisma.Decimal[]) {
  return values.reduce((total, value) => total.plus(value), decimal(0));
}

export function applyTax(subtotal: Prisma.Decimal, taxRatePercent: Prisma.Decimal.Value, discount: Prisma.Decimal.Value = 0) {
  const discountAmount = money(discount);
  const taxable = money(subtotal.minus(discountAmount));
  const safeTaxable = taxable.lessThan(0) ? money(0) : taxable;
  const tax = money(safeTaxable.mul(decimal(taxRatePercent)).div(100));
  const total = money(safeTaxable.plus(tax));
  return {
    subtotal: money(subtotal),
    discount: discountAmount,
    tax,
    total,
  };
}
