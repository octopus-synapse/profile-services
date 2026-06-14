/**
 * Inbound port — step 1 of the two-step email change. Verifies the current
 * password, ensures the new address is free, and emails a 6-digit code TO THE
 * NEW ADDRESS (proving the user controls it). The email is not changed yet.
 */

export interface RequestEmailChangeCommand {
  userId: string;
  currentPassword: string;
  newEmail: string;
}

export interface RequestEmailChangeResult {
  cooldownSeconds: number;
  /** Only in non-production with BYPASS_2FA. */
  testCode?: string;
}

export abstract class RequestEmailChangePort {
  abstract execute(command: RequestEmailChangeCommand): Promise<RequestEmailChangeResult>;
}
