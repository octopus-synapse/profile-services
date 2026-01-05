import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RecommendationService } from '../services/recommendation.service';
import {
  CreateRecommendationDto,
  UpdateRecommendationDto,
  RecommendationResponseDto,
} from '../dto/recommendation.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Recommendation } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationController extends BaseSubResourceController<
  Recommendation,
  CreateRecommendationDto,
  UpdateRecommendationDto,
  RecommendationResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Recommendation,
    CreateRecommendationDto,
    UpdateRecommendationDto,
    RecommendationResponseDto
  > = {
    entityName: 'recommendation',
    entityPluralName: 'recommendations',
    responseDtoClass: RecommendationResponseDto,
    createDtoClass: CreateRecommendationDto,
    updateDtoClass: UpdateRecommendationDto,
  };

  constructor(recommendationService: RecommendationService) {
    super(recommendationService);
  }
}
