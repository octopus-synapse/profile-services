import { Prisma } from '@prisma/client';
import type { CollaboratorRole } from '@/bounded-contexts/collaboration/domain/enums';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { DomainException } from '@/shared-kernel/exceptions';
import type { LoggerPort } from '@/shared-kernel/logger';
import { enforceQuotaInTx } from '@/shared-kernel/persistence/quota-guard';
import { runInTransaction } from '@/shared-kernel/persistence/transaction';
import { CollaborationRepositoryPort } from '../../domain/ports/collaboration-repository.port';
import type { CollaboratorWithUser, SharedResume } from '../../domain/types/collaboration.types';

const CTX = 'CollaborationRepository';

export class PrismaCollaborationRepository extends CollaborationRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findResumeOwner(resumeId: string): Promise<{ userId: string } | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { userId: true },
    });
  }

  async findCollaborator(
    resumeId: string,
    userId: string,
  ): Promise<{ id: string; role: string } | null> {
    return this.prisma.resumeCollaborator.findUnique({
      where: { resumeId_userId: { resumeId, userId } },
      select: { id: true, role: true },
    });
  }

  async findCollaborators(resumeId: string): Promise<CollaboratorWithUser[]> {
    const records = await this.prisma.resumeCollaborator.findMany({
      where: { resumeId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { invitedAt: 'asc' },
    });

    return records as CollaboratorWithUser[];
  }

  async createCollaborator(data: {
    resumeId: string;
    userId: string;
    role: CollaboratorRole;
    invitedBy: string;
  }): Promise<CollaboratorWithUser> {
    const record = await this.prisma.resumeCollaborator.create({
      data: {
        resumeId: data.resumeId,
        userId: data.userId,
        role: data.role,
        invitedBy: data.invitedBy,
        joinedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return record as CollaboratorWithUser;
  }

  async createCollaboratorWithQuota(
    data: {
      resumeId: string;
      userId: string;
      role: CollaboratorRole;
      invitedBy: string;
    },
    quota: { readonly max: number; readonly exception: DomainException },
  ): Promise<CollaboratorWithUser> {
    this.logger.log(`Inviting collaborator ${data.userId} to resume ${data.resumeId}`, CTX);
    return runInTransaction(this.prisma, async (tx) => {
      await enforceQuotaInTx(tx, {
        countSql: Prisma.sql`SELECT COUNT(*)::int AS "count" FROM "ResumeCollaborator" WHERE "resumeId" = ${data.resumeId} FOR UPDATE`,
        max: quota.max,
        exception: quota.exception,
      });
      const record = await tx.resumeCollaborator.create({
        data: {
          resumeId: data.resumeId,
          userId: data.userId,
          role: data.role,
          invitedBy: data.invitedBy,
          joinedAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
      return record as CollaboratorWithUser;
    });
  }

  async updateRole(
    resumeId: string,
    userId: string,
    role: CollaboratorRole,
  ): Promise<CollaboratorWithUser> {
    const record = await this.prisma.resumeCollaborator.update({
      where: { resumeId_userId: { resumeId, userId } },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return record as CollaboratorWithUser;
  }

  async deleteCollaborator(resumeId: string, userId: string): Promise<void> {
    await this.prisma.resumeCollaborator.delete({
      where: { resumeId_userId: { resumeId, userId } },
    });
  }

  async getSharedResumes(userId: string): Promise<SharedResume[]> {
    return this.prisma.resumeCollaborator.findMany({
      where: { userId },
      select: {
        role: true,
        invitedAt: true,
        resume: { select: { id: true, title: true } },
      },
      orderBy: { invitedAt: 'desc' },
    });
  }
}
