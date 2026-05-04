/**
 * Group Repository — no-op stub.
 *
 * Groups were removed from the auth model. The Permission gate composes
 * roles + AccessModifier; there is no group hierarchy to query.
 *
 * This stub keeps the GroupRepository contract so downstream
 * compositions that wire `IGroupRepository` continue to type-check
 * during the migration. Every method returns the empty/no-op outcome
 * a vanished group would naturally produce.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { Group, type GroupId } from '../../domain/entities/group.entity';
import type { PermissionId } from '../../domain/entities/permission.entity';
import type { RoleId } from '../../domain/entities/role.entity';
import type { IGroupRepository } from '../../domain/ports/authorization-repositories.port';

export class GroupRepository implements IGroupRepository {
  constructor(
    private readonly _prisma: PrismaService,
    private readonly _logger: LoggerPort,
  ) {}

  async findById(_id: GroupId): Promise<Group | null> {
    return null;
  }

  async findByIds(_ids: GroupId[]): Promise<Group[]> {
    return [];
  }

  async findByName(_name: string): Promise<Group | null> {
    return null;
  }

  async listAll(): Promise<Group[]> {
    return [];
  }

  async findAncestors(_groupId: GroupId): Promise<Group[]> {
    return [];
  }

  async findDescendants(_groupId: GroupId): Promise<Group[]> {
    return [];
  }

  async findRootGroups(): Promise<Group[]> {
    return [];
  }

  async create(_group: Group): Promise<Group> {
    throw new Error('Group operations are no longer supported.');
  }

  async update(_group: Group): Promise<Group> {
    throw new Error('Group operations are no longer supported.');
  }

  async delete(_id: GroupId): Promise<void> {
    // no-op
  }

  async addRole(_groupId: GroupId, _roleId: RoleId, _assignedBy?: string): Promise<void> {
    // no-op
  }

  async removeRole(_groupId: GroupId, _roleId: RoleId): Promise<void> {
    // no-op
  }

  async addPermission(
    _groupId: GroupId,
    _permissionId: PermissionId,
    _assignedBy?: string,
  ): Promise<void> {
    // no-op
  }

  async removePermission(_groupId: GroupId, _permissionId: PermissionId): Promise<void> {
    // no-op
  }

  async exists(_name: string): Promise<boolean> {
    return false;
  }
}
