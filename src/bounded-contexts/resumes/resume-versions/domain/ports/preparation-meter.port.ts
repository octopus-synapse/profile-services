export type PreparationReservation = { userId: string; periodStart: Date };

/** Counts a successful tailored version in the candidate's billing cycle. */
export abstract class PreparationMeterPort {
  recordAiUsage?(input: {
    userId: string;
    operation: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  }): Promise<void>;
  abstract reserve(userId: string): Promise<PreparationReservation | null>;
  abstract release(reservation: PreparationReservation | null): Promise<void>;
}
