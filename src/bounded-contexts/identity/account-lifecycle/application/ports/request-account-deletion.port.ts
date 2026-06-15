/**
 * Request Account Deletion Port (Inbound) — step 1 of the two-step,
 * code-confirmed deletion flow.
 *
 * Re-proves credential ownership (confirmation phrase + current password) and
 * emails a single-use 6-digit code. Nothing is erased here; the account is only
 * deleted after `ConfirmAccountDeletionPort` verifies the code.
 */

import type { DeleteAccountCommand } from './delete-account.port';

export type RequestAccountDeletionCommand = DeleteAccountCommand;

export interface RequestAccountDeletionResult {
  /** Seconds before a resend is allowed. */
  cooldownSeconds: number;
  /** Non-production only (BYPASS_2FA): the issued code, to ease testing. */
  testCode?: string;
}

export abstract class RequestAccountDeletionPort {
  /**
   * @throws AccountDeletionRequiresConfirmationException if the phrase is wrong
   * @throws UnauthorizedException if the password re-auth fails
   * @throws EntityNotFoundException if the user no longer exists
   */
  abstract execute(command: RequestAccountDeletionCommand): Promise<RequestAccountDeletionResult>;
}
