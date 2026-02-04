/**
 * User Authorization Repository Implementation
 *
 * Infrastructure layer implementation of IUserAuthorizationRepository.
 * Handles user-specific authorization data: roles, groups, and direct permissions.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { UserId } from '../../domain/entities/user-auth-context.entity';
import type { RoleId } from '../../domain/entities/role.entity';
import type { GroupId } from '../../domain/entities/group.entity';
import type { PermissionId } from '../../domain/entities/permission.entity';
import type {
  IUserAuthorizationRepository,
  UserPermissionAssignment,
  UserRoleAssignment,
  UserGroupMembership,
} from '../../domain/ports/authorization-repositories.port';

@Injectable()
export class UserAuthorizationRepository
  implements IUserAuthorizationRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async getUserPermissions(
    userId: UserId,
  ): Promise<UserPermissionAssignment[]> {
    const records = await this.prisma.userPermission.findMany({
      where: { userId },
      select: {
        permissionId: true,
        granted: true,
        expiresAt: true,
      },
    });

    return records.map((r) => ({
      permissionId: r.permissionId,
      granted: r.granted,
      expiresAt: r.expiresAt ?? undefined,
    }));
  }

  async getUserRoles(userId: UserId): Promise<UserRoleAssignment[]> {
    const records = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      select: {
        roleId: true,
        expiresAt: true,
      },
    });

    return records.map((r) => ({
      roleId: r.roleId,
      expiresAt: r.expiresAt ?? undefined,
    }));
  }

  async getUserGroups(userId: UserId): Promise<UserGroupMembership[]> {
    const records = await this.prisma.userGroup.findMany({
      where: { userId },
      select: {
        groupId: true,
        expiresAt: true,
      },
    });

    return records.map((r) => ({
      groupId: r.groupId,
      expiresAt: r.expiresAt ?? undefined,
    }));
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
      create: {
        userId,
        roleId,
        assignedBy: options?.assignedBy,
        expiresAt: options?.expiresAt,
      },
      update: {
        expiresAt: options?.expiresAt,
      },
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
        data: roleIds.map((roleId) => ({
          userId,
          roleId,
          assignedBy: options?.assignedBy,
        })),
      }),
    ]);
  }

  // ============================================================================
  // User Group Membership
  // ============================================================================

  async addToGroup(
    userId: UserId,
    groupId: GroupId,
    options?: { assignedBy?: string; expiresAt?: Date },
  ): Promise<void> {
    await this.prisma.userGroup.upsert({
      where: {
        userId_groupId: { userId, groupId },
      },
      create: {
        userId,
        groupId,
        assignedBy: options?.assignedBy,
        expiresAt: options?.expiresAt,
      },
      update: {
        expiresAt: options?.expiresAt,
      },
    });
  }

  async removeFromGroup(userId: UserId, groupId: GroupId): Promise<void> {
    await this.prisma.userGroup.deleteMany({
      where: { userId, groupId },
    });
  }

  async setGroups(
    userId: UserId,
    groupIds: GroupId[],
    options?: { assignedBy?: string },
  ): Promise<void> {
    await this.prisma.$transaction([
      // Remove all existing groups
      this.prisma.userGroup.deleteMany({
        where: { userId },
      }),
      // Add new groups
      this.prisma.userGroup.createMany({
        data: groupIds.map((groupId) => ({
          userId,
          groupId,
          assignedBy: options?.assignedBy,
        })),
      }),
    ]);
  }

  // ============================================================================
  // User Direct Permissions
  // ============================================================================

  async grantPermission(
    userId: UserId,
    permissionId: PermissionId,
    options?: { assignedBy?: string; expiresAt?: Date; reason?: string },
  ): Promise<void> {
    await this.prisma.userPermission.upsert({
      where: {
        userId_permissionId: { userId, permissionId },
      },
      create: {
        userId,
        permissionId,
        granted: true,
        assignedBy: options?.assignedBy,
        expiresAt: options?.expiresAt,
        reason: options?.reason,
      },
      update: {
        granted: true,
        expiresAt: options?.expiresAt,
        reason: options?.reason,
      },
    });
  }

  async denyPermission(
    userId: UserId,
    permissionId: PermissionId,
    options?: { assignedBy?: string; expiresAt?: Date; reason?: string },
  ): Promise<void> {
    await this.prisma.userPermission.upsert({
      where: {
        userId_permissionId: { userId, permissionId },
      },
      create: {
        userId,
        permissionId,
        granted: false,
        assignedBy: options?.assignedBy,
        expiresAt: options?.expiresAt,
        reason: options?.reason,
      },
      update: {
        granted: false,
        expiresAt: options?.expiresAt,
        reason: options?.reason,
      },
    });
  }

  async removeDirectPermission(
    userId: UserId,
    permissionId: PermissionId,
  ): Promise<void> {
    await this.prisma.userPermission.deleteMany({
      where: { userId, permissionId },
    });
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

  async getUsersInGroup(groupId: GroupId): Promise<UserId[]> {
    const records = await this.prisma.userGroup.findMany({
      where: {
        groupId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { userId: true },
    });

    return records.map((r) => r.userId);
  }

  async cleanupExpiredAssignments(): Promise<number> {
    const now = new Date();

    const [roles, groups, permissions] = await this.prisma.$transaction([
      this.prisma.userRoleAssignment.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      this.prisma.userGroup.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      this.prisma.userPermission.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ]);

    return roles.count + groups.count + permissions.count;
  }
}
