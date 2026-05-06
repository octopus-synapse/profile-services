import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { UserManagementRepositoryPort } from '../../ports/user-management.port';

/**
 * P2-119 — admin-initiated password reset (user-management flow).
 * Distinct from the token-based forgot-password flow in
 * `password-management/.../reset-password.use-case`, which is what
 * end users hit. This one is invoked by an admin acting on a
 * specific userId and intentionally skips token consumption +
 * session invalidation (the calling endpoint handles those).
 */
export class AdminResetUserPasswordUseCase {
  constructor(
    private readonly repository: UserManagementRepositoryPort,
    private readonly hashPassword: (password: string) => Promise<string>,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, newPassword: string): Promise<void> {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw new EntityNotFoundException('User');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    await this.repository.resetUserPassword(userId, hashedPassword);
  }
}
