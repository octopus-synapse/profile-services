/**
 * Check Last Admin Use Case
 *
 * Checks if a user is the last admin (for preventing last admin deletion).
 */

import type { UserId } from '../../../domain/entities/user-auth-context.entity';
import type { CheckRoleUseCase } from './check-role.use-case';
import type { CountUsersWithRoleUseCase } from './count-users-with-role.use-case';

export class CheckLastAdminUseCase {
  constructor(
    private readonly checkRole: CheckRoleUseCase,
    private readonly countUsersWithRole: CountUsersWithRoleUseCase,
  ) {}

  async execute(userId: UserId): Promise<boolean> {
    const isAdmin = await this.checkRole.execute(userId, 'admin');
    if (!isAdmin) return false;

    const adminCount = await this.countUsersWithRole.execute('admin');
    return adminCount <= 1;
  }
}
