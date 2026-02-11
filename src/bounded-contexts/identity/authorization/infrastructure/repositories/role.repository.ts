/**
 * Role Repository Implementation
 *
 * Infrastructure layer implementation of IRoleRepository.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { PermissionId } from '../../domain/entities/permission.entity';
import { Role, type RoleId } from '../../domain/entities/role.entity';
import type { IRoleRepository } from '../../domain/ports/authorization-repositories.port';

@Injectable()
export class RoleRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: RoleId): Promise<Role | null> {
    const record = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          select: { permissionId: true },
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findByIds(ids: RoleId[]): Promise<Role[]> {
    if (ids.length === 0) {
      return [];
    }

    const records = await this.prisma.role.findMany({
      where: { id: { in: ids } },
      include: {
        permissions: {
          select: { permissionId: true },
        },
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByName(name: string): Promise<Role | null> {
    const record = await this.prisma.role.findUnique({
      where: { name: name.toLowerCase() },
      include: {
        permissions: {
          select: { permissionId: true },
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findAll(): Promise<Role[]> {
    const records = await this.prisma.role.findMany({
      include: {
        permissions: {
          select: { permissionId: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });

    return records.map((r) => this.toDomain(r));
  }

  async create(role: Role): Promise<Role> {
    const record = await this.prisma.role.create({
      data: {
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isSystem: role.isSystem,
        priority: role.priority,
      },
      include: {
        permissions: {
          select: { permissionId: true },
        },
      },
    });

    return this.toDomain(record);
  }

  async update(role: Role): Promise<Role> {
    const record = await this.prisma.role.update({
      where: { id: role.id },
      data: {
        displayName: role.displayName,
        description: role.description,
        priority: role.priority,
        updatedAt: new Date(),
      },
      include: {
        permissions: {
          select: { permissionId: true },
        },
      },
    });

    return this.toDomain(record);
  }

  async delete(id: RoleId): Promise<void> {
    await this.prisma.role.delete({
      where: { id },
    });
  }

  async addPermission(
    roleId: RoleId,
    permissionId: PermissionId,
    assignedBy?: string,
  ): Promise<void> {
    await this.prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      create: {
        roleId,
        permissionId,
        assignedBy,
      },
      update: {},
    });
  }

  async removePermission(roleId: RoleId, permissionId: PermissionId): Promise<void> {
    await this.prisma.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });
  }

  async setPermissions(
    roleId: RoleId,
    permissionIds: PermissionId[],
    assignedBy?: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      // Remove all existing permissions
      this.prisma.rolePermission.deleteMany({
        where: { roleId },
      }),
      // Add new permissions
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
          assignedBy,
        })),
      }),
    ]);
  }

  async exists(name: string): Promise<boolean> {
    const count = await this.prisma.role.count({
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
    priority: number;
    createdAt: Date;
    updatedAt: Date;
    permissions: Array<{ permissionId: string }>;
  }): Role {
    return Role.fromPersistence({
      id: record.id,
      name: record.name,
      displayName: record.displayName,
      description: record.description ?? undefined,
      isSystem: record.isSystem,
      priority: record.priority,
      permissionIds: record.permissions.map((p) => p.permissionId),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
