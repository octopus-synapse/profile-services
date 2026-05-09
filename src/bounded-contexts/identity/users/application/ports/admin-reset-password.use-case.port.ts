export abstract class AdminResetPasswordUseCasePort {
  abstract execute(userId: string, newPassword: string): Promise<void>;
}
