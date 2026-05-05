/**
 * AccessModifier repository — Prisma adapter.
 */

import type { ModifierEffect, ModifierType } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { AccessModifierNotFoundException } from '../../application/use-cases/access-modifier/revoke-access-modifier.use-case';
import {
  AccessModifier,
  type AccessModifierId,
  type CreateAccessModifierInput,
  type ModifierEffect as DomainModifierEffect,
  type ModifierType as DomainModifierType,
  type UserId,
} from '../../domain/entities/access-modifier.entity';
import type { IAccessModifierRepository } from '../../domain/ports/access-modifier.port';

interface PrismaAccessModifierRow {
  id: string;
  userId: string;
  modifierType: ModifierType;
  effect: ModifierEffect;
  permissionId: string | null;
  reason: string;
  startsAt: Date;
  endsAt: Date | null;
  createdBy: string;
  revokedAt: Date | null;
  revokedBy: string | null;
  createdAt: Date;
}

function toDomain(row: PrismaAccessModifierRow): AccessModifier {
  return AccessModifier.fromProps({
    id: row.id,
    userId: row.userId,
    modifierType: row.modifierType as DomainModifierType,
    effect: row.effect as DomainModifierEffect,
    permissionId: row.permissionId,
    reason: row.reason,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdBy: row.createdBy,
    revokedAt: row.revokedAt,
    revokedBy: row.revokedBy,
    createdAt: row.createdAt,
  });
}

export class AccessModifierRepository implements IAccessModifierRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {}

  async create(input: CreateAccessModifierInput): Promise<AccessModifier> {
    this.logger.debug?.(
      `Creating ${input.effect} ${input.modifierType} for user ${input.userId}`,
      'AccessModifierRepository',
    );
    const row = await this.prisma.accessModifier.create({
      data: {
        userId: input.userId,
        modifierType: input.modifierType as ModifierType,
        effect: input.effect as ModifierEffect,
        permissionId: input.permissionId ?? null,
        reason: input.reason,
        startsAt: input.startsAt ?? new Date(),
        endsAt: input.endsAt ?? null,
        createdBy: input.createdBy,
      },
    });
    return toDomain(row);
  }

  async listForUser(userId: UserId): Promise<AccessModifier[]> {
    const rows = await this.prisma.accessModifier.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomain);
  }

  async findActiveForUser(userId: UserId, at: Date = new Date()): Promise<AccessModifier[]> {
    const rows = await this.prisma.accessModifier.findMany({
      where: {
        userId,
        revokedAt: null,
        startsAt: { lte: at },
        OR: [{ endsAt: null }, { endsAt: { gt: at } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomain);
  }

  async findById(id: AccessModifierId): Promise<AccessModifier | null> {
    const row = await this.prisma.accessModifier.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async getById(id: AccessModifierId): Promise<AccessModifier> {
    const row = await this.findById(id);
    if (!row) throw new AccessModifierNotFoundException(id);
    return row;
  }

  async revoke(
    id: AccessModifierId,
    revokedBy: UserId,
    revokedAt: Date = new Date(),
  ): Promise<void> {
    await this.prisma.accessModifier.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt, revokedBy },
    });
  }
}
