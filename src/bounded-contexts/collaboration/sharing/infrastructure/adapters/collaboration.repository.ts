import { Injectable } from '@nestjs/common';
import type { CollaboratorRole } from '@/bounded-contexts/collaboration/domain/enums';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { CollaborationRepositoryPort } from '../../domain/ports/collaboration-repository.port';
import type { CollaboratorWithUser, SharedResume } from '../../domain/types/collaboration.types';

@Injectable()
export class PrismaCollaborationRepository extends CollaborationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
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
