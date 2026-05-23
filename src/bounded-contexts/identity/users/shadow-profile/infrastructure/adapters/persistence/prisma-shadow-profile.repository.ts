import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import {
  type FindShadowCandidatesInput,
  ShadowProfileRepositoryPort,
  type ShadowProfileSnapshot,
  type UpsertShadowProfileInput,
} from '../../../application/ports/shadow-profile-repository.port';

function toSnapshot(row: {
  id: string;
  source: string;
  externalHandle: string;
  contactEmail: string | null;
  payload: unknown;
  claimedByUserId: string | null;
}): ShadowProfileSnapshot {
  return {
    id: row.id,
    source: row.source,
    externalHandle: row.externalHandle,
    contactEmail: row.contactEmail,
    payload: row.payload,
    claimedByUserId: row.claimedByUserId,
  };
}

export class PrismaShadowProfileRepository extends ShadowProfileRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }

  async upsert(input: UpsertShadowProfileInput): Promise<ShadowProfileSnapshot> {
    const payload = input.payload as Prisma.InputJsonValue;
    try {
      const row = await this.prisma.shadowProfile.upsert({
        where: {
          source_externalHandle: { source: input.source, externalHandle: input.externalHandle },
        },
        create: {
          source: input.source,
          externalHandle: input.externalHandle,
          contactEmail: input.contactEmail,
          payload,
        },
        update: { payload },
      });
      return toSnapshot(row);
    } catch (err) {
      this.logger?.error(
        `ShadowProfile upsert failed for ${input.source}/${input.externalHandle}`,
        {
          context: 'PrismaShadowProfileRepository',
          stack: err instanceof Error ? err.stack : undefined,
        },
      );
      throw err;
    }
  }

  async findCandidates(input: FindShadowCandidatesInput): Promise<ShadowProfileSnapshot[]> {
    const orClauses: Prisma.ShadowProfileWhereInput[] = [];
    if (input.email) orClauses.push({ contactEmail: input.email });
    if (input.githubLogin) {
      orClauses.push({ source: 'github', externalHandle: input.githubLogin });
    }
    if (orClauses.length === 0) return [];

    const rows = await this.prisma.shadowProfile.findMany({
      where: { claimedByUserId: null, OR: orClauses },
    });
    return rows.map(toSnapshot);
  }

  async findById(id: string): Promise<ShadowProfileSnapshot | null> {
    const row = await this.prisma.shadowProfile.findUnique({ where: { id } });
    return row ? toSnapshot(row) : null;
  }

  async markClaimed(id: string, userId: string): Promise<ShadowProfileSnapshot> {
    const row = await this.prisma.shadowProfile.update({
      where: { id },
      data: { claimedByUserId: userId, claimedAt: new Date() },
    });
    return toSnapshot(row);
  }
}
