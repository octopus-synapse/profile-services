import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Achievement } from '@prisma/client';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { CreateAchievement, UpdateAchievement } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/achievements')
@UseGuards(JwtAuthGuard)
export class AchievementController extends BaseSubResourceController<
  Achievement,
  CreateAchievement,
  UpdateAchievement,
  Achievement
> {
  protected readonly config: SubResourceControllerConfig<
    Achievement,
    CreateAchievement,
    UpdateAchievement,
    Achievement
  > = {
    entityName: 'achievement',
    entityPluralName: 'achievements',
  };
}
