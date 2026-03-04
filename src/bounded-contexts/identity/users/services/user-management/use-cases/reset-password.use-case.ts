import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { UserManagementRepositoryPort } from '../ports/user-management.port';

export class ResetPasswordUseCase {
  constructor(
    private readonly repository: UserManagementRepositoryPort,
    private readonly hashPassword: (password: string) => Promise<string>,
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
