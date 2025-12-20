import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenSourceContribution } from '@prisma/client';
import {
  CreateOpenSourceDto,
  UpdateOpenSourceDto,
} from '../dto/open-source.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class OpenSourceRepository {
  private readonly logger = new Logger(OpenSourceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<OpenSourceContribution>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.openSourceContribution.findMany({
        where: { resumeId },
        orderBy: { order: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.openSourceContribution.count({ where: { resumeId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(
    id: string,
    resumeId: string,
  ): Promise<OpenSourceContribution | null> {
    return this.prisma.openSourceContribution.findFirst({
      where: { id, resumeId },
    });
  }

  async create(
    resumeId: string,
    data: CreateOpenSourceDto,
  ): Promise<OpenSourceContribution> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.openSourceContribution.create({
      data: {
        resumeId,
        projectName: data.projectName,
        projectUrl: data.projectUrl,
        role: data.role,
        description: data.description,
        technologies: data.technologies ?? [],
        commits: data.commits ?? 0,
        prsCreated: data.prsCreated ?? 0,
        prsMerged: data.prsMerged ?? 0,
        issuesClosed: data.issuesClosed ?? 0,
        stars: data.stars ?? 0,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isCurrent: data.isCurrent ?? false,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateOpenSourceDto,
  ): Promise<OpenSourceContribution | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.openSourceContribution.update({
      where: { id },
      data: {
        ...(data.projectName && { projectName: data.projectName }),
        ...(data.projectUrl && { projectUrl: data.projectUrl }),
        ...(data.role && { role: data.role }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.technologies && { technologies: data.technologies }),
        ...(data.commits !== undefined && { commits: data.commits }),
        ...(data.prsCreated !== undefined && { prsCreated: data.prsCreated }),
        ...(data.prsMerged !== undefined && { prsMerged: data.prsMerged }),
        ...(data.issuesClosed !== undefined && {
          issuesClosed: data.issuesClosed,
        }),
        ...(data.stars !== undefined && { stars: data.stars }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.isCurrent !== undefined && { isCurrent: data.isCurrent }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return false;

    await this.prisma.openSourceContribution.delete({ where: { id } });
    return true;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.openSourceContribution.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  async getTotalStats(resumeId: string): Promise<{
    totalCommits: number;
    totalPRs: number;
    totalStars: number;
  }> {
    const result = await this.prisma.openSourceContribution.aggregate({
      where: { resumeId },
      _sum: {
        commits: true,
        prsMerged: true,
        stars: true,
      },
    });
    return {
      totalCommits: result._sum.commits ?? 0,
      totalPRs: result._sum.prsMerged ?? 0,
      totalStars: result._sum.stars ?? 0,
    };
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.openSourceContribution.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
