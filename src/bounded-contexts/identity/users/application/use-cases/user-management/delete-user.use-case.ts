import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { CannotDeleteOwnAccountAsAdminException } from '../../../domain/exceptions/users.exceptions';
import type { LastAdminProtectionRule } from '../../../domain/rules/last-admin-protection.rule';
import { DeleteUserUseCasePort } from '../../ports/delete-user.use-case.port';
import { UserManagementRepositoryPort } from '../../ports/user-management.port';

export class DeleteUserUseCase extends DeleteUserUseCasePort {
  constructor(
    private readonly repository: UserManagementRepositoryPort,
    private readonly lastAdminProtection: LastAdminProtectionRule,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }

  async execute(userId: string, requesterId: string): Promise<void> {
    if (userId === requesterId) {
      throw new CannotDeleteOwnAccountAsAdminException();
    }

    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new EntityNotFoundException('User');
    }

    await this.lastAdminProtection.ensureNotLastAdminBeforeDeletion(userId);

    await this.repository.deleteUser(userId);
    this.logger?.log(`Deleted user ${userId}`, 'DeleteUserUseCase', { requesterId });
  }
}
