import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Resume } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { type CreateResumeData, type UpdateResumeData } from '@/shared-kernel';
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

    await this.ensureResumeOwnership(id, userId);

    await this.prisma.resume.delete({
      where: { id },
    });

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
