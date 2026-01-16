import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Resume } from '@prisma/client';
import {
  type CreateResume,
  type UpdateResume,
} from '@octopus-synapse/profile-contracts';

/**
 * Repository-level DTO types.
 * Excludes nested relations which are handled separately by sub-resource repositories.
 * The API layer (CreateResume/UpdateResume) may include relations for convenience,
 * but the repository deals with flat resume data only.
 */
type CreateResumeData = Omit<
  CreateResume,
  | 'experiences'
  | 'educations'
  | 'skills'
  | 'languages'
  | 'certifications'
  | 'projects'
>;

type UpdateResumeData = Omit<
  UpdateResume,
  | 'experiences'
  | 'educations'
  | 'skills'
  | 'languages'
  | 'certifications'
  | 'projects'
>;

@Injectable()
export class ResumesRepository {
  private readonly logger = new Logger(ResumesRepository.name);

  private readonly includeRelations = {
    experiences: { orderBy: { order: 'asc' as const } },
    education: { orderBy: { startDate: 'desc' as const } },
    skills: { orderBy: { order: 'asc' as const } },
    languages: { orderBy: { order: 'asc' as const } },
    projects: { orderBy: { createdAt: 'desc' as const } },
    certifications: { orderBy: { issueDate: 'desc' as const } },
    awards: { orderBy: { date: 'desc' as const } },
    recommendations: { orderBy: { createdAt: 'desc' as const } },
    interests: { orderBy: { order: 'asc' as const } },
  };

  constructor(private readonly prisma: PrismaService) {}

  async findAllUserResumes(userId: string): Promise<Resume[]> {
    return await this.prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findResumeByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Resume | null> {
    return await this.prisma.resume.findFirst({
      where: { id, userId },
      include: this.includeRelations,
    });
  }

  async createResumeForUser(
    userId: string,
    resumeCreationData: CreateResumeData,
  ): Promise<Resume> {
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

    await this.ensureResumeOwnership(id, userId);

    await this.prisma.resume.delete({
      where: { id },
    });

    return true;
  }

  private async ensureResumeOwnership(
    id: string,
    userId: string,
  ): Promise<void> {
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
  async findAllUserResumesPaginated(
    userId: string,
    skip: number,
    take: number,
  ): Promise<Resume[]> {
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
