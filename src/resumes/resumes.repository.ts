import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Resume } from '@prisma/client';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';

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

  async findAll(userId: string): Promise<Resume[]> {
    return await this.prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string): Promise<Resume | null> {
    return await this.prisma.resume.findFirst({
      where: { id, userId },
      include: this.includeRelations,
    });
  }

  async create(userId: string, data: CreateResumeDto): Promise<Resume> {
    this.logger.log(`Creating resume for user: ${userId}`);
    return await this.prisma.resume.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: UpdateResumeDto,
  ): Promise<Resume | null> {
    this.logger.log(`Updating resume: ${id}`);

    // Verify ownership
    const resume = await this.findOne(id, userId);
    if (!resume) {
      return null;
    }

    return await this.prisma.resume.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    this.logger.log(`Deleting resume: ${id}`);

    // Verify ownership
    const resume = await this.findOne(id, userId);
    if (!resume) {
      return false;
    }

    await this.prisma.resume.delete({
      where: { id },
    });

    return true;
  }

  async findByUserId(userId: string): Promise<Resume | null> {
    return await this.prisma.resume.findFirst({
      where: { userId },
      include: this.includeRelations,
    });
  }
}
