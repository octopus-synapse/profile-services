import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { CannotDeleteOwnAccountAsAdminException } from '../../../domain/exceptions/users.exceptions';
import { UserManagementRepositoryPort } from '../../ports/user-management.port';

export class DeleteUserUseCase {
  constructor(private readonly repository: UserManagementRepositoryPort) {}

  async execute(userId: string, requesterId: string): Promise<void> {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw new EntityNotFoundException('User');
    }

    if (userId === requesterId) {
      throw new CannotDeleteOwnAccountAsAdminException();
    }

    await this.repository.deleteUser(userId);
  }
}
