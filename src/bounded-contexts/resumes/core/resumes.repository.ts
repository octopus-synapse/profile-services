import { Injectable, Logger } from '@nestjs/common';
import { Resume } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { type CreateResumeData, type UpdateResumeData } from '@/shared-kernel';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { ResumesRepositoryPort } from './ports/resumes-repository.port';

@Injectable()
export class ResumesRepository extends ResumesRepositoryPort {
  private readonly logger = new Logger(ResumesRepository.name);

  private readonly includeRelations = {
    resumeSections: {
      orderBy: { order: 'asc' as const },
      include: {
        sectionType: true,
        items: {
          orderBy: { order: 'asc' as const },
        },
      },
    },
    activeTheme: {
      select: {
        id: true,
        name: true,
        description: true,
      },
    },
  };

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAllUserResumes(userId: string): Promise<Resume[]> {
    return await this.prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findResumeByIdAndUserId(id: string, userId: string): Promise<Resume | null> {
    return await this.prisma.resume.findFirst({
      where: { id, userId },
      include: this.includeRelations,
    });
  }

  async createResumeForUser(userId: string, resumeCreationData: CreateResumeData): Promise<Resume> {
    this.logger.log(`Creating resume for user: ${userId}`);
    const resumeData = {
      userId,
      ...resumeCreationData,
    };
    return await this.prisma.resume.create({
      data: resumeData,
    });
  }

  async updateResumeForUser(
    id: string,
    userId: string,
    resumeUpdateData: UpdateResumeData,
  ): Promise<Resume | null> {
    this.logger.log(`Updating resume: ${id}`);

    await this.ensureResumeOwnership(id, userId);

    return await this.prisma.resume.update({
      where: { id },
      data: resumeUpdateData,
    });
  }

  async deleteResumeForUser(id: string, userId: string): Promise<boolean> {
    this.logger.log(`Deleting resume: ${id}`);

    // Use deleteMany with both id and userId to avoid race conditions
    // This is atomic and handles concurrent delete requests gracefully
    const result = await this.prisma.resume.deleteMany({
      where: { id, userId },
    });

    // If count is 0, either the resume doesn't exist or user doesn't own it
    if (result.count === 0) {
      // Check if resume exists but belongs to another user
      const resume = await this.prisma.resume.findUnique({ where: { id } });
      if (resume) {
        throw new ForbiddenException('Access denied to resume');
      }
      // Resume doesn't exist - could have been deleted by concurrent request
      throw new EntityNotFoundException('Resume', id);
    }

    return true;
  }

  private async ensureResumeOwnership(id: string, userId: string): Promise<void> {
    const resume = await this.findResumeByIdAndUserId(id, userId);
    if (!resume) {
      throw new ForbiddenException('Access denied to resume');
    }
  }

  async findResumeByUserId(userId: string): Promise<Resume | null> {
    return await this.prisma.resume.findFirst({
      where: { userId },
      include: this.includeRelations,
    });
  }

  /**
   * BUG-015 FIX: Proper database pagination
   */
  async findAllUserResumesPaginated(userId: string, skip: number, take: number): Promise<Resume[]> {
    return await this.prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    });
  }

  /**
   * BUG-015 FIX: Count for pagination
   */
  async countUserResumes(userId: string): Promise<number> {
    return await this.prisma.resume.count({
      where: { userId },
    });
  }
}
