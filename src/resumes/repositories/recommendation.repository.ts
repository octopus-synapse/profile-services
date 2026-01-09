import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Recommendation } from '@prisma/client';
import {
  CreateRecommendationDto,
  UpdateRecommendationDto,
} from '../dto/recommendation.dto';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Recommendation entities
 *
 * Ordering strategy: User-defined (order field, ascending)
 * Rationale: Recommendations have no natural chronological order - user control is most appropriate.
 */
@Injectable()
export class RecommendationRepository extends BaseSubResourceRepository<
  Recommendation,
  CreateRecommendationDto,
  UpdateRecommendationDto
> {
  protected readonly logger = new Logger(RecommendationRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.recommendation;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'user-defined' };
  }

  protected mapCreateDto(
    resumeId: string,
    dto: CreateRecommendationDto,
    order: number,
  ) {
    return buildCreateData({ resumeId, order: dto.order ?? order }, dto, {
      author: 'string',
      position: 'optional',
      company: 'optional',
      content: 'string',
      date: 'date',
    });
  }

  protected mapUpdateDto(dto: UpdateRecommendationDto) {
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
