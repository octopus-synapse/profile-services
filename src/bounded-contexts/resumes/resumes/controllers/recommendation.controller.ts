import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Recommendation } from '@prisma/client';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { CreateRecommendation, UpdateRecommendation } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
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
}
