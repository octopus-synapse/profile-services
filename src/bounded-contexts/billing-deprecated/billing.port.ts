import type { PaidPatchPlan } from './patch-go.constants';

export type PatchGoReservation = { userId: string; periodStart: Date };
export type FreeTranslationReservation = { userId: string; monthStart: Date; count: number };

export interface PaidAccessPort {
  requirePaid(userId: string): Promise<void>;
  isPaid(userId: string): Promise<boolean>;
}

export interface FreeTranslationMeterPort {
  freeTranslationRemaining(userId: string): Promise<number>;
  reserveFreeTranslation(userId: string, count?: number): Promise<FreeTranslationReservation | null>;
  releaseFreeTranslation(reservation: FreeTranslationReservation | null): Promise<void>;
}

export interface AiUsageRecorderPort {
  recordAiUsage(input: {
    userId: string;
    operation: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  }): Promise<void>;
}

/** Compatibility facade used by HTTP composition while consumers migrate to narrow ports. */
export abstract class BillingPort
  implements PaidAccessPort, FreeTranslationMeterPort, AiUsageRecorderPort
{
  abstract readonly enabled: boolean;
  abstract requirePaid(userId: string): Promise<void>;
  abstract isPaid(userId: string): Promise<boolean>;
  abstract freeTranslationRemaining(userId: string): Promise<number>;
  abstract reserveFreeTranslation(
    userId: string,
    count?: number,
  ): Promise<FreeTranslationReservation | null>;
  abstract releaseFreeTranslation(reservation: FreeTranslationReservation | null): Promise<void>;
  abstract recordAiUsage(input: {
    userId: string;
    operation: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  }): Promise<void>;
  abstract reserve(userId: string): Promise<PatchGoReservation | null>;
  abstract release(reservation: PatchGoReservation | null): Promise<void>;
  abstract status(userId: string): Promise<unknown>;
  abstract checkout(userId: string, plan: PaidPatchPlan): Promise<string>;
}
