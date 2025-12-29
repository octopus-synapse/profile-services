import { Injectable, Logger } from '@nestjs/common';
import { Recommendation } from '@prisma/client';
import { RecommendationRepository } from '../repositories/recommendation.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateRecommendationDto,
  UpdateRecommendationDto,
} from '../dto/recommendation.dto';
import { BaseSubResourceService } from './base';

@Injectable()
export class RecommendationService extends BaseSubResourceService<
  Recommendation,
  CreateRecommendationDto,
  UpdateRecommendationDto
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
