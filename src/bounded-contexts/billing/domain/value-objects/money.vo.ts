import { BillingInvariantException } from '../exceptions/billing.exceptions';

export class Money {
  private constructor(
    readonly cents: number,
    readonly currency: 'BRL',
  ) {}

  static brl(cents: number): Money {
    if (!Number.isSafeInteger(cents) || cents < 0) throw new BillingInvariantException('money');
    return new Money(cents, 'BRL');
  }

  subtract(other: Money): Money {
    return Money.brl(Math.max(0, this.cents - other.cents));
  }
}
