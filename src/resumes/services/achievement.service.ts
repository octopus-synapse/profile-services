import { Injectable, Logger } from '@nestjs/common';
import { Achievement } from '@prisma/client';
import { AchievementRepository } from '../repositories/achievement.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateAchievement,
  UpdateAchievement,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';

@Injectable()
export class AchievementService extends BaseSubResourceService<
  Achievement,
  CreateAchievement,
  UpdateAchievement
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
