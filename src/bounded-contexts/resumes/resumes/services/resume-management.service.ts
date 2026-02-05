/**
 * Resume Management Service
 *
 * Operations that require elevated permissions on resume resources.
 * Access controlled by permission system, not hardcoded roles.
 *
 * Single Responsibility: CRUD operations on resumes requiring 'resume:*' permissions.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisher } from '@/shared-kernel';
import { ResumeDeletedEvent } from '../../domain/events';
import { ERROR_MESSAGES } from '@/shared-kernel';

@Injectable()
export class ResumeManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  // ============================================================================
  // Query Operations (require 'resume:read' or 'resume:manage')
  // ============================================================================

  /**
   * List all resumes for a specific user
   */
  async listResumesForUser(userId: string) {
    await this.ensureUserExists(userId);

    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      include: {
        skills: true,
        experiences: true,
        education: true,
        _count: {
          select: {
            skills: true,
            experiences: true,
            education: true,
            projects: true,
            certifications: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return { resumes };
  }

  /**
   * Get full details of any resume
   */
  async getResumeDetails(resumeId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        skills: { orderBy: { order: 'asc' } },
        experiences: { orderBy: { order: 'asc' } },
        education: { orderBy: { order: 'asc' } },
        projects: { orderBy: { order: 'asc' } },
        certifications: { orderBy: { order: 'asc' } },
        languages: { orderBy: { order: 'asc' } },
        awards: { orderBy: { order: 'asc' } },
      },
    });

    if (!resume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    return resume;
  }

  // ============================================================================
  // Mutation Operations (require 'resume:delete' or 'resume:manage')
  // ============================================================================

  /**
   * Delete any resume (elevated permission)
   */
  async deleteResume(resumeId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true, userId: true },
    });

    if (!resume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    // CRITICAL: Publish event BEFORE delete so handlers can cleanup
    this.eventPublisher.publish(
      new ResumeDeletedEvent(resumeId, { userId: resume.userId }),
    );

    await this.prisma.resume.delete({ where: { id: resumeId } });

    return {
      success: true,
      message: 'Resume deleted successfully',
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
  }

  private async ensureResumeExists(resumeId: string): Promise<void> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true },
    });

    if (!resume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }
  }
}
