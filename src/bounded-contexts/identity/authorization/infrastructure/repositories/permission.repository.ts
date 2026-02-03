/**
 * Permission Repository Implementation
 *
 * Infrastructure layer implementation of IPermissionRepository.
 * Follows Dependency Inversion Principle - domain depends on abstraction,
 * this implementation depends on Prisma (detail).
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  Permission,
  type PermissionId,
} from '../../domain/entities/permission.entity';
import type { IPermissionRepository } from '../../domain/ports/authorization-repositories.port';

@Injectable()
export class PermissionRepository implements IPermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: PermissionId): Promise<Permission | null> {
    const record = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findByIds(ids: PermissionId[]): Promise<Permission[]> {
    if (ids.length === 0) {
      return [];
    }

    const records = await this.prisma.permission.findMany({
      where: { id: { in: ids } },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByKey(
    resource: string,
    action: string,
  ): Promise<Permission | null> {
    const record = await this.prisma.permission.findUnique({
      where: {
        resource_action: {
          resource: resource.toLowerCase(),
          action: action.toLowerCase(),
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findAll(): Promise<Permission[]> {
    const records = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByResource(resource: string): Promise<Permission[]> {
    const records = await this.prisma.permission.findMany({
      where: { resource: resource.toLowerCase() },
      orderBy: { action: 'asc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async create(permission: Permission): Promise<Permission> {
    const record = await this.prisma.permission.create({
      data: {
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
        isSystem: permission.isSystem,
      },
    });

    return this.toDomain(record);
  }

  async update(permission: Permission): Promise<Permission> {
    const record = await this.prisma.permission.update({
      where: { id: permission.id },
      data: {
        description: permission.description,
        updatedAt: new Date(),
      },
    });

    return this.toDomain(record);
  }

  async delete(id: PermissionId): Promise<void> {
    await this.prisma.permission.delete({
      where: { id },
    });
  }

  async exists(resource: string, action: string): Promise<boolean> {
    const count = await this.prisma.permission.count({
      where: {
        resource: resource.toLowerCase(),
        action: action.toLowerCase(),
      },
    });

    return count > 0;
  }

  private toDomain(record: {
    id: string;
    resource: string;
    action: string;
    description: string | null;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Permission {
    return Permission.fromPersistence({
      id: record.id,
      resource: record.resource,
      action: record.action,
      description: record.description ?? undefined,
      isSystem: record.isSystem,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
