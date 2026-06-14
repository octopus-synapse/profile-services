/**
 * Inbound port — step 2 of the two-step password change. Applies the stashed
 * new password once the emailed code is confirmed, then invalidates sessions.
 */

export interface ConfirmPasswordChangeCommand {
  userId: string;
  code: string;
}

export interface ConfirmPasswordChangeResult {
  success: true;
}

export abstract class ConfirmPasswordChangePort {
  abstract execute(command: ConfirmPasswordChangeCommand): Promise<ConfirmPasswordChangeResult>;
}
