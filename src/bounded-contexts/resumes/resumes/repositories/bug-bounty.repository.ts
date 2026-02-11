import { Injectable, Logger } from '@nestjs/common';
import { BugBounty } from '@prisma/client';
import type { CreateBugBounty, UpdateBugBounty } from '@/shared-kernel';
import { BaseSubResourceRepository, buildUpdateData, OrderByConfig } from './base';

/**
 * Repository for BugBounty entities
 *
 * Ordering strategy: Date-based (reportedAt DESC, most recent first)
 * Rationale: Bug bounties are chronological events - most recent reports should appear first.
 */
@Injectable()
export class BugBountyRepository extends BaseSubResourceRepository<
  BugBounty,
  CreateBugBounty,
  UpdateBugBounty
> {
  protected readonly logger = new Logger(BugBountyRepository.name);

  protected getPrismaDelegate() {
    return this.prisma.bugBounty;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'date-desc', field: 'reportedAt' };
  }

  protected mapCreate(resumeId: string, dto: CreateBugBounty, order: number) {
    return {
      resumeId,
      platform: dto.platform,
      company: dto.company,
      severity: dto.severity,
      vulnerabilityType: dto.vulnerabilityType,
      cveId: dto.cveId,
      reward: dto.reward,
      currency: dto.currency,
      reportUrl: dto.reportUrl,
      reportedAt: new Date(dto.reportedAt),
      resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : null,
      order: order,
    };
  }

  protected mapUpdate(dto: UpdateBugBounty) {
    return buildUpdateData(dto, {
      platform: 'string',
      company: 'string',
      severity: 'string',
      vulnerabilityType: 'string',
      cveId: 'optional',
      reward: 'number',
      currency: 'string',
      reportUrl: 'optional',
      reportedAt: 'date',
      resolvedAt: 'nullableDate',
      order: 'number',
    });
  }

  // ============================================================================
  // BUG-BOUNTY-SPECIFIC METHODS (not in ISubResourceRepository interface)
  // ============================================================================

  /**
   * Get total rewards earned across all bug bounties for a resume
   * Returns sum of all reward amounts in their original currencies
   */
  async getTotalRewards(resumeId: string): Promise<number> {
    const result = await this.prisma.bugBounty.aggregate({
      where: { resumeId },
      _sum: { reward: true },
    });
    return result._sum.reward ?? 0;
  }
}
