export type PreparationReservation = { userId: string; periodStart: Date };
export type FreeTranslationReservation = { userId: string; monthStart: Date; count: number };

export interface PaidAccessPort {
  requirePaid(userId: string): Promise<void>;
  isPaid(userId: string): Promise<boolean>;
}
export interface PreparationMeterPort {
  reserve(userId: string): Promise<PreparationReservation | null>;
  release(reservation: PreparationReservation | null): Promise<void>;
  recordAiUsage?(input: {
    userId: string;
    operation: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  }): Promise<void>;
}
export interface FreeTranslationMeterPort {
  freeTranslationRemaining(userId: string): Promise<number>;
  reserveFreeTranslation(
    userId: string,
    count?: number,
  ): Promise<FreeTranslationReservation | null>;
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
