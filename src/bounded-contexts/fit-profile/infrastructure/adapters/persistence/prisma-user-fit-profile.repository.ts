import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import {
  type SavedUserFitProfile,
  UserFitProfileRepositoryPort,
  type UserFitProfileWrite,
} from '../../../domain/ports/user-fit-profile.repository.port';
import type { FitVector } from '../../../domain/types';

/** Empty vector marker used when we anonymize an existing row (LGPD).
 * We can't write a nullable JSON column with a literal `null` under the
 * Prisma default — `JsonNull` is the idiomatic way to do it. */
const ANONYMIZED_VECTOR: Prisma.InputJsonValue = { bigFive: {}, schwartz: {}, sdt: {} };

export class PrismaUserFitProfileRepository extends UserFitProfileRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findByUserId(userId: string): Promise<SavedUserFitProfile | null> {
    const row = await this.prisma.userFitProfile.findUnique({ where: { userId } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async upsert(input: UserFitProfileWrite): Promise<SavedUserFitProfile> {
    // P1 #15 — concurrent submissions used to read `previous.version`
    // and write `previous.version + 1`, so two parallel writes both
    // produced the same value (lost update). Switching to Prisma's
    // `{ increment: 1 }` makes the version bump a single SQL UPDATE
    // statement that the database serialises per-row; concurrent
    // upserts now land on distinct, monotonic version numbers.
    const vectorJson = input.vector as unknown as Prisma.InputJsonValue;
    const row = await this.prisma.userFitProfile.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        vectorJson,
        version: 1,
        expiresAt: input.expiresAt,
      },
      update: {
        vectorJson,
        version: { increment: 1 },
        expiresAt: input.expiresAt,
        computedAt: new Date(),
      },
    });
    return this.toDomain(row);
  }

  async anonymize(userId: string): Promise<void> {
    const existing = await this.prisma.userFitProfile.findUnique({ where: { userId } });
    if (!existing) return;
    await this.prisma.userFitProfile.update({
      where: { userId },
      data: { vectorJson: ANONYMIZED_VECTOR },
    });
  }

  private toDomain(row: {
    id: string;
    userId: string;
    vectorJson: Prisma.JsonValue;
    version: number;
    computedAt: Date;
    expiresAt: Date;
  }): SavedUserFitProfile {
    const vector = row.vectorJson as unknown as FitVector | null;
    const isAnonymized =
      !vector || (isEmpty(vector.bigFive) && isEmpty(vector.schwartz) && isEmpty(vector.sdt));
    return {
      id: row.id,
      userId: row.userId,
      vector: isAnonymized ? null : vector,
      version: row.version,
      computedAt: row.computedAt,
      expiresAt: row.expiresAt,
    };
  }
}

function isEmpty(obj: Record<string, unknown> | undefined): boolean {
  if (!obj) return true;
  for (const _ in obj) return false;
  return true;
}
