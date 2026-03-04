/**
 * Deactivate Account Port (Inbound)
 *
 * Use-case interface for account deactivation.
 */

export interface DeactivateAccountCommand {
  userId: string;
  reason?: string;
}

export interface DeactivateAccountResult {
  success: true;
}

export interface DeactivateAccountPort {
  /**
   * Deactivates a user account (soft delete).
   * @throws EntityNotFoundException if user not found
   * @throws AccountDeactivatedException if account is already deactivated
   */
  execute(command: DeactivateAccountCommand): Promise<DeactivateAccountResult>;
}

export const DEACTIVATE_ACCOUNT_PORT = Symbol('DeactivateAccountPort');
