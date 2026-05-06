/**
 * Per-UC port for `AdminResetUserPasswordUseCase`.
 *
 * Distinct from the user-initiated password reset flow (which lives in
 * the password-management submodule under
 * identity/password-management/) — this is the elevated-permission
 * variant that lets an admin force a new password without going through
 * the email-token round trip.
 */

export abstract class AdminResetPasswordUseCasePort {
  abstract execute(userId: string, newPassword: string): Promise<void>;
}
