/**
 * User Authorization Repository Implementation
 *
 * Backs role assignments via Prisma. Per-user grants/suspensions live
 * in `AccessModifier` (handled by a dedicated repository, not this one).
 *
 * P0-009: the legacy Group hierarchy was removed by the
 * `20260430040810_authz_refactor` migration. The previous "no-op"
 * group methods (kept for interface parity during the migration window)
 * are now gone too — invoking them at runtime against the dropped
 * tables would have been a confusing red herring.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { PermissionId } from '../../domain/entities/permission.entity';
import type { RoleId } from '../../domain/entities/role.entity';
import type { UserId } from '../../domain/entities/user-auth-context.entity';
import type {
  IUserAuthorizationRepository,
  UserPermissionAssignment,
  UserRoleAssignment,
} from '../../domain/ports/authorization-repositories.port';

export class UserAuthorizationRepository implements IUserAuthorizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPermissions(_userId: UserId): Promise<UserPermissionAssignment[]> {
    // Direct user permissions are tracked in `AccessModifier` now —
    // this repository no longer surfaces them. The permission resolver
    // composes role permissions with AccessModifier rows separately.
    return [];
  }

  async getUserRoles(userId: UserId): Promise<UserRoleAssignment[]> {
    const records = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      select: { roleId: true, expiresAt: true },
    });

    return records.map((r) => ({ roleId: r.roleId, expiresAt: r.expiresAt ?? undefined }));
  }

  // ============================================================================
  // User Role Assignment
  // ============================================================================

  async assignRole(
    userId: UserId,
    roleId: RoleId,
    options?: { assignedBy?: string; expiresAt?: Date },
  ): Promise<void> {
    await this.prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: { userId, roleId },
      },
      create: { userId, roleId, assignedBy: options?.assignedBy, expiresAt: options?.expiresAt },
      update: { expiresAt: options?.expiresAt },
    });
  }

  async revokeRole(userId: UserId, roleId: RoleId): Promise<void> {
    await this.prisma.userRoleAssignment.deleteMany({
      where: { userId, roleId },
    });
  }

  async setRoles(
    userId: UserId,
    roleIds: RoleId[],
    options?: { assignedBy?: string },
  ): Promise<void> {
    await this.prisma.$transaction([
      // Remove all existing roles
      this.prisma.userRoleAssignment.deleteMany({
        where: { userId },
      }),
      // Add new roles
      this.prisma.userRoleAssignment.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId, assignedBy: options?.assignedBy })),
      }),
    ]);
  }

  // ============================================================================
  // User Direct Permissions — moved to AccessModifier (no-ops here)
  // ============================================================================

  async grantPermission(
    _userId: UserId,
    _permissionId: PermissionId,
    _options?: { assignedBy?: string; expiresAt?: Date; reason?: string },
  ): Promise<void> {
    // no-op (use AccessModifier with effect=GRANT instead)
  }

  async denyPermission(
    _userId: UserId,
    _permissionId: PermissionId,
    _options?: { assignedBy?: string; expiresAt?: Date; reason?: string },
  ): Promise<void> {
    // no-op (use AccessModifier with effect=DENY instead)
  }

  async removeDirectPermission(_userId: UserId, _permissionId: PermissionId): Promise<void> {
    // no-op
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  async getUsersWithRole(roleId: RoleId): Promise<UserId[]> {
    const records = await this.prisma.userRoleAssignment.findMany({
      where: {
        roleId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { userId: true },
    });

    return records.map((r) => r.userId);
  }

  /**
   * Count users with a specific role
   */
  async countUsersWithRole(roleId: RoleId): Promise<number> {
    return this.prisma.userRoleAssignment.count({
      where: {
        roleId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  /**
   * Count users with a specific role by name
   */
  async countUsersWithRoleName(roleName: string): Promise<number> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
      select: { id: true },
    });

    if (!role) return 0;

    return this.countUsersWithRole(role.id);
  }

  async cleanupExpiredAssignments(): Promise<number> {
    const now = new Date();

    const expired = await this.prisma.userRoleAssignment.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    return expired.count;
  }
}
