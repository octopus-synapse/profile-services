/**
 * Collaboration Repository
 * Data access layer for resume collaboration operations
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma, Resume, ResumeCollaborator } from '@prisma/client';
import type { CollaboratorRole } from '@octopus-synapse/profile-contracts';

/**
 * Collaborator with user info
 */
export type CollaboratorWithUser = Prisma.ResumeCollaboratorGetPayload<{
  include: {
    user: true;
  };
}>;

@Injectable()
export class CollaborationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a resume by ID
   */
  async findResumeById(resumeId: string): Promise<Resume | null> {
    return await this.prisma.resume.findUnique({ where: { id: resumeId } });
  }

  /**
   * Find a collaborator by resume and user ID
   */
  async findByResumeAndUser(
    resumeId: string,
    userId: string,
  ): Promise<ResumeCollaborator | null> {
    return await this.prisma.resumeCollaborator.findFirst({
      where: { resumeId, userId },
    });
  }

  /**
   * Create a new collaborator
   */
  async create(data: {
    resumeId: string;
    userId: string;
    role: CollaboratorRole;
    invitedBy: string;
    joinedAt: Date;
  }): Promise<CollaboratorWithUser> {
    const result = await this.prisma.resumeCollaborator.create({
      data,
      include: {
        user: true,
      },
    });
    return result;
  }

  /**
   * Find all collaborators for a resume
   */
  async findAllByResumeId(resumeId: string): Promise<CollaboratorWithUser[]> {
    const results = await this.prisma.resumeCollaborator.findMany({
      where: { resumeId },
      include: {
        user: true,
      },
      orderBy: { invitedAt: 'asc' },
    });
    return results;
  }

  /**
   * Update a collaborator's role
   */
  async updateRole(
    resumeId: string,
    userId: string,
    newRole: CollaboratorRole,
  ): Promise<CollaboratorWithUser> {
    const result = await this.prisma.resumeCollaborator.update({
      where: {
        resumeId_userId: { resumeId, userId },
      },
      data: { role: newRole },
      include: {
        user: true,
      },
    });
    return result;
  }

  /**
   * Delete a collaborator by ID
   */
  async delete(collaboratorId: string): Promise<void> {
    await this.prisma.resumeCollaborator.delete({
      where: { id: collaboratorId },
    });
  }

  /**
   * Find all resumes shared with a user
   */
  async findSharedWithUser(userId: string): Promise<
    Array<{
      role: string;
      invitedAt: Date;
      resume: { id: string; title: string | null };
    }>
  > {
    const results = await this.prisma.resumeCollaborator.findMany({
      where: { userId },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });
    return results;
  }
}
