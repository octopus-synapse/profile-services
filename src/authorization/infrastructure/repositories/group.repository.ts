/**
 * Group Repository Implementation
 *
 * Infrastructure layer implementation of IGroupRepository.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Group, type GroupId } from '../../domain/entities/group.entity';
import type { RoleId } from '../../domain/entities/role.entity';
import type { PermissionId } from '../../domain/entities/permission.entity';
import type { IGroupRepository } from '../../domain/services/permission-resolver.service';

@Injectable()
export class GroupRepository implements IGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: GroupId): Promise<Group | null> {
    const record = await this.prisma.group.findUnique({
      where: { id },
      include: {
        roles: { select: { roleId: true } },
        permissions: { select: { permissionId: true } },
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findByIds(ids: GroupId[]): Promise<Group[]> {
    if (ids.length === 0) {
      return [];
    }

    const records = await this.prisma.group.findMany({
      where: { id: { in: ids } },
      include: {
        roles: { select: { roleId: true } },
        permissions: { select: { permissionId: true } },
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByName(name: string): Promise<Group | null> {
    const record = await this.prisma.group.findUnique({
      where: { name: name.toLowerCase() },
      include: {
        roles: { select: { roleId: true } },
        permissions: { select: { permissionId: true } },
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findAll(): Promise<Group[]> {
    const records = await this.prisma.group.findMany({
      include: {
        roles: { select: { roleId: true } },
        permissions: { select: { permissionId: true } },
      },
      orderBy: { name: 'asc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  /**
   * Find all ancestors of a group (parent, grandparent, etc.)
   * Uses recursive CTE for efficient hierarchy traversal
   */
  async findAncestors(groupId: GroupId): Promise<Group[]> {
    // Get the group and follow parent chain
    const ancestors: Group[] = [];
    let currentId: string | null = groupId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        // Circular reference detected - stop
        break;
      }
      visited.add(currentId);

      const group = await this.prisma.group.findUnique({
        where: { id: currentId },
        include: {
          roles: { select: { roleId: true } },
          permissions: { select: { permissionId: true } },
        },
      });

      if (!group) {
        break;
      }

      // Don't include the original group in ancestors
      if (group.id !== groupId) {
        ancestors.push(this.toDomain(group));
      }

      currentId = group.parentId;
    }

    return ancestors;
  }

  /**
   * Find all descendants of a group (children, grandchildren, etc.)
   */
  async findDescendants(groupId: GroupId): Promise<Group[]> {
    const descendants: Group[] = [];
    const queue: string[] = [groupId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);

      const children = await this.prisma.group.findMany({
        where: { parentId: currentId },
        include: {
          roles: { select: { roleId: true } },
          permissions: { select: { permissionId: true } },
        },
      });

      for (const child of children) {
        descendants.push(this.toDomain(child));
        queue.push(child.id);
      }
    }

    return descendants;
  }

  async findRootGroups(): Promise<Group[]> {
    const records = await this.prisma.group.findMany({
      where: { parentId: null },
      include: {
        roles: { select: { roleId: true } },
        permissions: { select: { permissionId: true } },
      },
      orderBy: { name: 'asc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async create(group: Group): Promise<Group> {
    const record = await this.prisma.group.create({
      data: {
        name: group.name,
        displayName: group.displayName,
        description: group.description,
        isSystem: group.isSystem,
        parentId: group.parentId,
      },
      include: {
        roles: { select: { roleId: true } },
        permissions: { select: { permissionId: true } },
      },
    });

    return this.toDomain(record);
  }

  async update(group: Group): Promise<Group> {
    const record = await this.prisma.group.update({
      where: { id: group.id },
      data: {
        displayName: group.displayName,
        description: group.description,
        parentId: group.parentId,
        updatedAt: new Date(),
      },
      include: {
        roles: { select: { roleId: true } },
        permissions: { select: { permissionId: true } },
      },
    });

    return this.toDomain(record);
  }

  async delete(id: GroupId): Promise<void> {
    await this.prisma.group.delete({
      where: { id },
    });
  }

  async addRole(
    groupId: GroupId,
    roleId: RoleId,
    assignedBy?: string,
  ): Promise<void> {
    await this.prisma.groupRole.upsert({
      where: {
        groupId_roleId: { groupId, roleId },
      },
      create: {
        groupId,
        roleId,
        assignedBy,
      },
      update: {},
    });
  }

  async removeRole(groupId: GroupId, roleId: RoleId): Promise<void> {
    await this.prisma.groupRole.deleteMany({
      where: { groupId, roleId },
    });
  }

  async addPermission(
    groupId: GroupId,
    permissionId: PermissionId,
    assignedBy?: string,
  ): Promise<void> {
    await this.prisma.groupPermission.upsert({
      where: {
        groupId_permissionId: { groupId, permissionId },
      },
      create: {
        groupId,
        permissionId,
        assignedBy,
      },
      update: {},
    });
  }

  async removePermission(
    groupId: GroupId,
    permissionId: PermissionId,
  ): Promise<void> {
    await this.prisma.groupPermission.deleteMany({
      where: { groupId, permissionId },
    });
  }

  async exists(name: string): Promise<boolean> {
    const count = await this.prisma.group.count({
      where: { name: name.toLowerCase() },
    });

    return count > 0;
  }

  private toDomain(record: {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    isSystem: boolean;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    roles: Array<{ roleId: string }>;
    permissions: Array<{ permissionId: string }>;
  }): Group {
    return Group.fromPersistence({
      id: record.id,
      name: record.name,
      displayName: record.displayName,
      description: record.description ?? undefined,
      isSystem: record.isSystem,
      parentId: record.parentId ?? undefined,
      roleIds: record.roles.map((r) => r.roleId),
      permissionIds: record.permissions.map((p) => p.permissionId),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
