import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { JobType } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { paginate } from '@/shared-kernel/database';

@Injectable()
export class JobService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    authorId: string,
    dto: {
      title: string;
      company: string;
      location?: string;
      jobType: JobType;
      description: string;
      requirements?: string[];
      skills?: string[];
      salaryRange?: string;
      applyUrl?: string;
      expiresAt?: Date;
    },
  ) {
    return this.prisma.job.create({
      data: {
        authorId,
        title: dto.title,
        company: dto.company,
        location: dto.location,
        jobType: dto.jobType,
        description: dto.description,
        requirements: dto.requirements ?? [],
        skills: dto.skills ?? [],
        salaryRange: dto.salaryRange,
        applyUrl: dto.applyUrl,
        expiresAt: dto.expiresAt,
      },
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    jobType?: JobType;
    skills?: string[];
  }) {
    const where: Record<string, unknown> = { isActive: true };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.jobType) {
      where.jobType = query.jobType;
    }

    if (query.skills && query.skills.length > 0) {
      where.skills = { hasSome: query.skills };
    }

    return paginate(this.prisma.job, {
      page: query.page,
      pageSize: query.limit ? Math.min(query.limit, 100) : undefined,
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            photoURL: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async update(
    id: string,
    userId: string,
    dto: {
      title?: string;
      company?: string;
      location?: string;
      jobType?: JobType;
      description?: string;
      requirements?: string[];
      skills?: string[];
      salaryRange?: string;
      applyUrl?: string;
      isActive?: boolean;
      expiresAt?: Date;
    },
  ) {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.authorId !== userId) {
      throw new ForbiddenException('You can only update your own jobs');
    }

    return this.prisma.job.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own jobs');
    }

    return this.prisma.job.delete({ where: { id } });
  }

  async getMyJobs(userId: string, page = 1, limit = 20) {
    return paginate(this.prisma.job, {
      page,
      pageSize: Math.min(limit, 100),
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
