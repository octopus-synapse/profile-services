/**
 * Per-UC port for `DeleteUserUseCase` (admin endpoint).
 *
 * The UC enforces:
 *   - the target user exists,
 *   - the requester is not deleting their own account,
 *   - removing this user does not leave the platform without a privileged
 *     user (see `LastAdminProtectionRule`).
 */

export abstract class DeleteUserUseCasePort {
  abstract execute(userId: string, requesterId: string): Promise<void>;
}
