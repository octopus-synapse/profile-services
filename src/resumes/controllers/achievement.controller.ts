import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AchievementService } from '../services/achievement.service';
import type {
  CreateAchievement,
  UpdateAchievement,
} from '@octopus-synapse/profile-contracts';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Achievement } from '@prisma/client';

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
