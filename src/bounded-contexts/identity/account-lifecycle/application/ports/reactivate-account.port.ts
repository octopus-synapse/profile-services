/**
 * Reactivate Account Port (Inbound)
 *
 * Use-case interface for re-enabling a previously deactivated account.
 * Symmetric with `DeactivateAccountPort` — together they form the
 * pause/resume axis of the account lifecycle.
 */

export interface ReactivateAccountCommand {
  userId: string;
}

export interface ReactivateAccountResult {
  success: true;
}

export abstract class ReactivateAccountPort {
  /**
   * Reactivates a previously deactivated account.
   * @throws EntityNotFoundException if user not found
   * @throws AccountAlreadyActiveException if account is already active
   */
  abstract execute(command: ReactivateAccountCommand): Promise<ReactivateAccountResult>;
}
