/**
 * Inbound port — step 2 of the two-step email change. Commits the pending new
 * email once the emailed code is confirmed, then invalidates sessions.
 */

export interface ConfirmEmailChangeCommand {
  userId: string;
  code: string;
}

export interface ConfirmEmailChangeResult {
  newEmail: string;
}

export abstract class ConfirmEmailChangePort {
  abstract execute(command: ConfirmEmailChangeCommand): Promise<ConfirmEmailChangeResult>;
}
