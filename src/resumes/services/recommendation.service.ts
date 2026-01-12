import { Injectable, Logger } from '@nestjs/common';
import { Recommendation } from '@prisma/client';
import { RecommendationRepository } from '../repositories/recommendation.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateRecommendation,
  UpdateRecommendation,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';

@Injectable()
export class RecommendationService extends BaseSubResourceService<
  Recommendation,
  CreateRecommendation,
  UpdateRecommendation
> {
  protected readonly entityName = 'Recommendation';
  protected readonly logger = new Logger(RecommendationService.name);

  constructor(
    recommendationRepository: RecommendationRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(recommendationRepository, resumesRepository);
  }
}
