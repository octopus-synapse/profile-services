import type { PaidPatchPlan } from '../policies/billing-offer.policy';

export interface BillingEntitlementState {
  readonly id: string;
  readonly userId: string;
  readonly purchaseId: string | null;
  readonly source: string;
  readonly sourceRef: string;
  readonly plan: PaidPatchPlan;
  readonly status: 'active' | 'replaced' | 'revoked';
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly quotaAnchorAt: Date;
  readonly terminatedAt: Date | null;
}

export class BillingEntitlement {
  private constructor(private state: BillingEntitlementState) {}
  static restore(state: BillingEntitlementState): BillingEntitlement {
    return new BillingEntitlement(state);
  }
  get snapshot(): BillingEntitlementState {
    return { ...this.state };
  }
  isActive(at: Date): boolean {
    return this.state.status === 'active' && this.state.startsAt <= at && this.state.endsAt > at;
  }
  replace(at: Date): void {
    this.state = { ...this.state, status: 'replaced', terminatedAt: at };
  }
  revoke(at: Date): void {
    this.state = { ...this.state, status: 'revoked', terminatedAt: at, endsAt: at };
  }
  restore(): void {
    this.state = { ...this.state, status: 'active', terminatedAt: null };
  }
}
