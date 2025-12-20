import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BugBounty } from '@prisma/client';
import { CreateBugBountyDto, UpdateBugBountyDto } from '../dto/bug-bounty.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class BugBountyRepository {
  private readonly logger = new Logger(BugBountyRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<BugBounty>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.bugBounty.findMany({
        where: { resumeId },
        orderBy: { reportedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bugBounty.count({ where: { resumeId } }),
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

  async findOne(id: string, resumeId: string): Promise<BugBounty | null> {
    return this.prisma.bugBounty.findFirst({
      where: { id, resumeId },
    });
  }

  async create(resumeId: string, data: CreateBugBountyDto): Promise<BugBounty> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.bugBounty.create({
      data: {
        resumeId,
        platform: data.platform,
        company: data.company,
        severity: data.severity,
        vulnerabilityType: data.vulnerabilityType,
        cveId: data.cveId,
        reward: data.reward,
        currency: data.currency ?? 'USD',
        reportUrl: data.reportUrl,
        reportedAt: new Date(data.reportedAt),
        resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : null,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateBugBountyDto,
  ): Promise<BugBounty | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.bugBounty.update({
      where: { id },
      data: {
        ...(data.platform && { platform: data.platform }),
        ...(data.company && { company: data.company }),
        ...(data.severity && { severity: data.severity }),
        ...(data.vulnerabilityType && {
          vulnerabilityType: data.vulnerabilityType,
        }),
        ...(data.cveId !== undefined && { cveId: data.cveId }),
        ...(data.reward !== undefined && { reward: data.reward }),
        ...(data.currency && { currency: data.currency }),
        ...(data.reportUrl !== undefined && { reportUrl: data.reportUrl }),
        ...(data.reportedAt && { reportedAt: new Date(data.reportedAt) }),
        ...(data.resolvedAt !== undefined && {
          resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : null,
        }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return false;

    await this.prisma.bugBounty.delete({ where: { id } });
    return true;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.bugBounty.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  async getTotalRewards(resumeId: string): Promise<number> {
    const result = await this.prisma.bugBounty.aggregate({
      where: { resumeId },
      _sum: { reward: true },
    });
    return result._sum.reward ?? 0;
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.bugBounty.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
