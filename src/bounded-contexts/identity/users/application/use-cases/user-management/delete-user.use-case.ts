import { EntityNotFoundException, ForbiddenException } from '@/shared-kernel/exceptions';
import type { UserManagementRepositoryPort } from '../../ports/user-management.port';

export class DeleteUserUseCase {
  constructor(private readonly repository: UserManagementRepositoryPort) {}

  async execute(userId: string, requesterId: string): Promise<void> {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw new EntityNotFoundException('User');
    }

    if (userId === requesterId) {
      throw new ForbiddenException('Cannot delete your own account through admin interface');
    }

    await this.repository.deleteUser(userId);
  }
}
