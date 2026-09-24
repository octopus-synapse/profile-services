export interface BillingRuntimeConfig {
  readonly enabled: boolean;
  readonly cardEnabled: boolean;
  readonly pixEnabled: boolean;
  readonly ordersPublicKey: string | null;
  readonly subscriptionsPublicKey: string | null;
  readonly frontendUrl: string;
  readonly aiCostBrlPerUsd: number;
}

export abstract class BillingClockPort {
  abstract now(): Date;
}
export abstract class BillingIdPort {
  abstract id(): string;
  abstract token(): string;
  abstract hash(value: string): string;
}
