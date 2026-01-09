import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenSourceContribution } from '@prisma/client';
import {
  CreateOpenSourceDto,
  UpdateOpenSourceDto,
} from '../dto/open-source.dto';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
} from './base';

/**
 * Repository for OpenSourceContribution entities
 *
 * Ordering strategy: User-defined (order field, ascending)
 * Rationale: Open source contributions have no natural chronological order - user control is most appropriate.
 */
@Injectable()
export class OpenSourceRepository extends BaseSubResourceRepository<
  OpenSourceContribution,
  CreateOpenSourceDto,
  UpdateOpenSourceDto
> {
  protected readonly logger = new Logger(OpenSourceRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.openSourceContribution;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'user-defined' };
  }

  protected mapCreateDto(
    resumeId: string,
    dto: CreateOpenSourceDto,
    order: number,
  ) {
    return {
      resumeId,
      projectName: dto.projectName,
      projectUrl: dto.projectUrl,
      role: dto.role,
      description: dto.description,
      technologies: dto.technologies ?? [],
      commits: dto.commits ?? 0,
      prsCreated: dto.prsCreated ?? 0,
      prsMerged: dto.prsMerged ?? 0,
      issuesClosed: dto.issuesClosed ?? 0,
      stars: dto.stars ?? 0,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isCurrent: dto.isCurrent ?? false,
      order: dto.order ?? order,
    };
  }

  protected mapUpdateDto(dto: UpdateOpenSourceDto) {
    return buildUpdateData(dto, {
      projectName: 'string',
      projectUrl: 'string',
      role: 'string',
      description: 'optional',
      technologies: 'array',
      commits: 'number',
      prsCreated: 'number',
      prsMerged: 'number',
      issuesClosed: 'number',
      stars: 'number',
      startDate: 'date',
      endDate: 'nullableDate',
      isCurrent: 'boolean',
      order: 'number',
    });
  }

  // ============================================================================
  // OPEN-SOURCE-SPECIFIC METHODS (not in ISubResourceRepository interface)
  // ============================================================================

  /**
   * Get aggregated statistics for all open source contributions
   * Returns total commits, merged PRs, and stars across all contributions
   */
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
}
