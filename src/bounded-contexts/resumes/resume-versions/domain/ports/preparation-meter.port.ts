export type PreparationReservation = { userId: string; periodStart: Date };

/** Counts a successful tailored version in the candidate's billing cycle. */
export abstract class PreparationMeterPort {
  abstract reserve(userId: string): Promise<PreparationReservation | null>;
  abstract release(reservation: PreparationReservation | null): Promise<void>;
}
