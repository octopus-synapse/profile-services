/**
 * Confirm Account Deletion Port (Inbound) — step 2 of the two-step,
 * code-confirmed deletion flow. Verifies the emailed 6-digit code, then
 * permanently erases the account.
 */

export interface ConfirmAccountDeletionCommand {
  userId: string;
  code: string;
}

export interface ConfirmAccountDeletionResult {
  success: true;
}

export abstract class ConfirmAccountDeletionPort {
  /**
   * @throws InvalidAccountDeletionCodeException if the code is wrong/expired
   * @throws EntityNotFoundException if the user no longer exists
   */
  abstract execute(command: ConfirmAccountDeletionCommand): Promise<ConfirmAccountDeletionResult>;
}
