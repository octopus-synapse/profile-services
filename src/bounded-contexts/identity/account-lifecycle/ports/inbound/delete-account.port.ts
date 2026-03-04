/**
 * Delete Account Port (Inbound)
 *
 * Use-case interface for permanent account deletion.
 */

export interface DeleteAccountCommand {
  userId: string;
  confirmationPhrase: string;
}

export interface DeleteAccountResult {
  success: true;
}

export interface DeleteAccountPort {
  /**
   * Permanently deletes a user account and all associated data.
   * @throws EntityNotFoundException if user not found
   * @throws AccountDeletionRequiresConfirmationException if confirmation is invalid
   */
  execute(command: DeleteAccountCommand): Promise<DeleteAccountResult>;
}

export const DELETE_ACCOUNT_PORT = Symbol('DeleteAccountPort');

/**
 * Required confirmation phrase for account deletion
 */
export const DELETION_CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT';
