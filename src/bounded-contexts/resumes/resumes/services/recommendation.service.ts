import { Injectable, Logger } from '@nestjs/common';
import { Recommendation } from '@prisma/client';
import { RecommendationRepository } from '../repositories/recommendation.repository';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import {
  CreateRecommendation,
  UpdateRecommendation,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';
import { EventPublisher } from '@/shared-kernel';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';

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
