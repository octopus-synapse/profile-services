import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { AchievementService } from '../services/achievement.service';
import type { CreateAchievement, UpdateAchievement } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Achievement } from '@prisma/client';

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

  constructor(achievementService: AchievementService) {
    super(achievementService);
  }
}
