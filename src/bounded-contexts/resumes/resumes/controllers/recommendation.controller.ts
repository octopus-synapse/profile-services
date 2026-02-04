import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { RecommendationService } from '../services/recommendation.service';
import type {
  CreateRecommendation,
  UpdateRecommendation,
} from '@octopus-synapse/profile-contracts';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Recommendation } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationController extends BaseSubResourceController<
  Recommendation,
  CreateRecommendation,
  UpdateRecommendation,
  Recommendation
> {
  protected readonly config: SubResourceControllerConfig<
    Recommendation,
    CreateRecommendation,
    UpdateRecommendation,
    Recommendation
  > = {
    entityName: 'recommendation',
    entityPluralName: 'recommendations',
  };

  constructor(recommendationService: RecommendationService) {
    super(recommendationService);
  }
}
