import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AchievementService } from '../services/achievement.service';
import {
  CreateAchievementDto,
  UpdateAchievementDto,
  AchievementResponseDto,
} from '../dto/achievement.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Achievement } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/achievements')
@UseGuards(JwtAuthGuard)
export class AchievementController extends BaseSubResourceController<
  Achievement,
  CreateAchievementDto,
  UpdateAchievementDto,
  AchievementResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Achievement,
    CreateAchievementDto,
    UpdateAchievementDto,
    AchievementResponseDto
  > = {
    entityName: 'achievement',
    entityPluralName: 'achievements',
    responseDtoClass: AchievementResponseDto,
    createDtoClass: CreateAchievementDto,
    updateDtoClass: UpdateAchievementDto,
  };

  constructor(achievementService: AchievementService) {
    super(achievementService);
  }
}
