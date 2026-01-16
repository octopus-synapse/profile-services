/**
 * Resume Admin Service
 * Single Responsibility: Admin operations on resumes
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';

@Injectable()
export class ResumeAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllResumesForUser(userId: string) {
    await this.ensureUserExists(userId);

    const userResumes = await this.prisma.resume.findMany({
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

    return { resumes: userResumes };
  }

  async findResumeByIdForAdmin(resumeId: string) {
    const foundResume = await this.prisma.resume.findUnique({
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

    if (!foundResume) {
      throw new NotFoundException('Resume not found');
    }

    return foundResume;
  }

  async deleteResumeForAdmin(resumeId: string) {
    await this.ensureResumeExists(resumeId);

    await this.prisma.resume.delete({ where: { id: resumeId } });

    return {
      success: true,
      message: 'Resume deleted successfully',
    };
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
  }

  private async ensureResumeExists(resumeId: string): Promise<void> {
    const existingResume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });
    if (!existingResume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }
  }
}
