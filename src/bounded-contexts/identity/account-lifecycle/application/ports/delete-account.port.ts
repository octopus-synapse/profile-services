/**
 * Delete Account Port (Inbound)
 *
 * Use-case interface for permanent account deletion.
 */

export interface DeleteAccountCommand {
  userId: string;
  confirmationPhrase: string;
  /**
   * P0-#8 follow-up: re-auth proof. The use-case rejects deletion when this
   * doesn't match the stored bcrypt hash. Without this gate a stolen JWT
   * cookie is sufficient to erase the account.
   */
  currentPassword: string;
}

export interface DeleteAccountResult {
  success: true;
}

export abstract class DeleteAccountPort {
  /**
   * Permanently deletes a user account and all associated data.
   * @throws EntityNotFoundException if user not found
   * @throws AccountDeletionRequiresConfirmationException if confirmation is invalid
   */
  abstract execute(command: DeleteAccountCommand): Promise<DeleteAccountResult>;
}

/**
 * Required confirmation phrase for account deletion
 */
export const DELETION_CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT';
