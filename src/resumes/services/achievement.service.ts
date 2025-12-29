import { Injectable, Logger } from '@nestjs/common';
import { Achievement } from '@prisma/client';
import { AchievementRepository } from '../repositories/achievement.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateAchievementDto,
  UpdateAchievementDto,
} from '../dto/achievement.dto';
import { BaseSubResourceService } from './base';

@Injectable()
export class AchievementService extends BaseSubResourceService<
  Achievement,
  CreateAchievementDto,
  UpdateAchievementDto
> {
  protected readonly entityName = 'Achievement';
  protected readonly logger = new Logger(AchievementService.name);

  constructor(
    achievementRepository: AchievementRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(achievementRepository, resumesRepository);
  }
}
