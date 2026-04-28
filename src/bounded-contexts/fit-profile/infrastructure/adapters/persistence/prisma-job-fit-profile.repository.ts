import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import {
  JobFitProfileRepositoryPort,
  type JobFitProfileWrite,
  type SavedJobFitProfile,
} from '../../../domain/ports/job-fit-profile.repository.port';
import type { FitVector } from '../../../domain/types';

export class PrismaJobFitProfileRepository extends JobFitProfileRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findByJobId(jobId: string): Promise<SavedJobFitProfile | null> {
    const row = await this.prisma.jobFitProfile.findUnique({ where: { jobId } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async upsert(input: JobFitProfileWrite): Promise<SavedJobFitProfile> {
    const vectorJson = input.vector as unknown as Prisma.InputJsonValue;
    const row = await this.prisma.jobFitProfile.upsert({
      where: { jobId: input.jobId },
      create: { jobId: input.jobId, vectorJson, editedByUserId: input.editedByUserId },
      update: { vectorJson, editedByUserId: input.editedByUserId, computedAt: new Date() },
    });
    return this.toDomain(row);
  }

  private toDomain(row: {
    id: string;
    jobId: string;
    vectorJson: Prisma.JsonValue;
    editedByUserId: string;
    computedAt: Date;
  }): SavedJobFitProfile {
    return {
      id: row.id,
      jobId: row.jobId,
      vector: row.vectorJson as unknown as FitVector,
      editedByUserId: row.editedByUserId,
      computedAt: row.computedAt,
    };
  }
}
