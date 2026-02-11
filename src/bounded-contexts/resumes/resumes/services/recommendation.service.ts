import { Injectable, Logger } from '@nestjs/common';
import { Recommendation } from '@prisma/client';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import { CreateRecommendation, EventPublisher, UpdateRecommendation } from '@/shared-kernel';
import { RecommendationRepository } from '../repositories/recommendation.repository';
import { BaseSubResourceService } from './base';

@Injectable()
export class RecommendationService extends BaseSubResourceService<
  Recommendation,
  CreateRecommendation,
  UpdateRecommendation
> {
  protected readonly entityName = 'Recommendation';
  protected readonly sectionType: SectionType = 'recommendations';
  protected readonly logger = new Logger(RecommendationService.name);

  constructor(
    recommendationRepository: RecommendationRepository,
    resumesRepository: ResumesRepository,
    eventPublisher: EventPublisher,
  ) {
    super(recommendationRepository, resumesRepository, eventPublisher);
  }
}
