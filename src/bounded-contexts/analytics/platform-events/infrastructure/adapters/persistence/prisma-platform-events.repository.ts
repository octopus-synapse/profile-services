/**
 * Prisma-backed implementation of `PlatformEventsRepositoryPort`. Bulk
 * insert via `createMany`; `props` is mapped to Prisma's JsonNull when
 * absent so we don't write SQL NULL into a `Json` column.
 */

import { type Prisma, Prisma as PrismaNs } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type { PlatformEvent } from '../../../domain/entities/platform-event';
import { PlatformEventsRepositoryPort } from '../../../domain/ports/platform-events.repository.port';

export class PrismaPlatformEventsRepository extends PlatformEventsRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async persist(events: readonly PlatformEvent[]): Promise<{ accepted: number }> {
    const rows = events.map((e) => ({
      userId: e.userId,
      event: e.event,
      props: (e.props ?? PrismaNs.JsonNull) as Prisma.InputJsonValue,
      occurredAt: e.occurredAt,
    }));
    const result = await this.prisma.platformEvent.createMany({ data: rows });
    return { accepted: result.count };
  }
}
