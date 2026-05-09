import type { AuthorizationServicePort } from '@/bounded-contexts/identity/authorization';
import {
  LastAdminCannotBeRemovedException,
  LastManagerCannotBeDeletedException,
} from '../exceptions/users.exceptions';

const ADMIN_ROLE_ID = 'role_admin';
const ADMIN_ROLE_NAME = 'admin';

export class LastAdminProtectionRule {
  constructor(private readonly authorization: AuthorizationServicePort) {}

  async ensureNotLastAdminBeforeDeletion(userId: string): Promise<void> {
    const hasManagePermission = await this.authorization.hasPermission(userId, 'user', 'manage');
    if (!hasManagePermission) return;

    const adminCount = await this.authorization.countUsersWithRole(ADMIN_ROLE_NAME);
    if (adminCount <= 1) {
      throw new LastManagerCannotBeDeletedException();
    }
  }

  async ensureRoleChangeKeepsAtLeastOneAdmin(
    _userId: string,
    nextRoles: readonly string[],
    currentRoles: readonly string[],
  ): Promise<void> {
    if (nextRoles.includes(ADMIN_ROLE_ID)) return;
    if (!currentRoles.includes(ADMIN_ROLE_ID)) return;

    const adminCount = await this.authorization.countUsersWithRole(ADMIN_ROLE_NAME);
    if (adminCount <= 1) {
      throw new LastAdminCannotBeRemovedException();
    }
  }
}
