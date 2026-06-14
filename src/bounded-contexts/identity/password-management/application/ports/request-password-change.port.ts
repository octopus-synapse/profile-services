/**
 * Inbound port — step 1 of the two-step password change. Validates the
 * current + new password and emails a 6-digit confirmation code (the password
 * is NOT changed yet; the hashed new password is stashed until confirm).
 */

export interface RequestPasswordChangeCommand {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface RequestPasswordChangeResult {
  cooldownSeconds: number;
  /** Only in non-production with BYPASS_2FA, to ease local/e2e testing. */
  testCode?: string;
}

export abstract class RequestPasswordChangePort {
  abstract execute(command: RequestPasswordChangeCommand): Promise<RequestPasswordChangeResult>;
}
