import { describe, expect, it } from 'bun:test';
import { PATCH_BILLING_OFFERS } from './patch-go.constants';

describe('Patch billing offers', () => {
  it('keeps every public price in integer BRL cents', () => {
    expect(PATCH_BILLING_OFFERS.go_pix_quarter.amountCents).toBe(10_990);
    expect(PATCH_BILLING_OFFERS.go_pix_year.amountCents).toBe(39_990);
    expect(PATCH_BILLING_OFFERS.max_pix_quarter.amountCents).toBe(39_990);
    expect(PATCH_BILLING_OFFERS.max_pix_year.amountCents).toBe(119_990);
  });

  it('limits the Max annual founder offer without changing its table price', () => {
    expect(PATCH_BILLING_OFFERS.max_pix_year_founder).toMatchObject({
      amountCents: 99_990,
      listAmountCents: 119_990,
      founderLimit: 100,
      termMonths: 12,
    });
  });

  it('only marks card offers as recurring', () => {
    for (const offer of Object.values(PATCH_BILLING_OFFERS))
      expect(offer.recurring).toBe(offer.paymentMethod === 'card');
  });
});
