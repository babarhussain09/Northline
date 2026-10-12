import { describe, expect, it } from 'vitest';
import { applyTax, assertPurchasable, priceService } from '../src/utils/pricing';

describe('pricing', () => {
  it('prices a one-time service from the catalog, including setup', () => {
    const priced = priceService(
      { billingType: 'ONE_TIME', price: 100, setupFee: 25, currency: 'USD' },
      2,
    );
    expect(priced.unitPrice.toFixed(2)).toBe('100.00');
    expect(priced.lineTotal.toFixed(2)).toBe('250.00');
  });

  it('uses the monthly price for recurring services', () => {
    const priced = priceService(
      { billingType: 'RECURRING', price: 0, setupFee: 50, monthlyPrice: 80, currency: 'USD' },
      1,
    );
    expect(priced.unitPrice.toFixed(2)).toBe('80.00');
    expect(priced.lineTotal.toFixed(2)).toBe('130.00');
  });

  it('refuses a custom service that has no price', () => {
    const message = assertPurchasable({
      billingType: 'CUSTOM',
      price: 0,
      setupFee: 0,
      currency: 'USD',
      isActive: true,
      isPublished: true,
    });
    expect(message).toMatch(/quote/i);
  });

  it('applies tax after the subtotal', () => {
    const totals = applyTax(priceService({ billingType: 'ONE_TIME', price: '200', setupFee: 0, currency: 'USD' }, 1).lineTotal, 10);
    expect(totals.tax.toFixed(2)).toBe('20.00');
    expect(totals.total.toFixed(2)).toBe('220.00');
  });
});
