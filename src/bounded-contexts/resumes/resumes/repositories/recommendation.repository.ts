import { Injectable, Logger } from '@nestjs/common';
import { Recommendation } from '@prisma/client';
import { CreateRecommendation, UpdateRecommendation } from '@/shared-kernel';
import { BaseSubResourceRepository, buildCreateData, buildUpdateData, OrderByConfig } from './base';

/**
 * Repository for Recommendation entities
 *
 * Ordering strategy: User-defined (order field, ascending)
 * Rationale: Recommendations have no natural chronological order - user control is most appropriate.
 */
@Injectable()
export class RecommendationRepository extends BaseSubResourceRepository<
  Recommendation,
  CreateRecommendation,
  UpdateRecommendation
> {
  protected readonly logger = new Logger(RecommendationRepository.name);

  protected getPrismaDelegate() {
    return this.prisma.recommendation;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'user-defined' };
  }

  protected mapCreate(resumeId: string, dto: CreateRecommendation, order: number) {
    return buildCreateData({ resumeId, order: order }, dto, {
      author: 'string',
      position: 'optional',
      company: 'optional',
      content: 'string',
      date: 'date',
    });
  }

  protected mapUpdate(dto: UpdateRecommendation) {
    return buildUpdateData(dto, {
      author: 'string',
      position: 'optional',
      company: 'optional',
      content: 'string',
      date: 'date',
      order: 'number',
    });
  }
}
