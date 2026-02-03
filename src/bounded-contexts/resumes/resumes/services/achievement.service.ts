import { Injectable, Logger } from '@nestjs/common';
import { Achievement } from '@prisma/client';
import { AchievementRepository } from '../repositories/achievement.repository';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import {
  CreateAchievement,
  UpdateAchievement,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';
import { EventPublisher } from '@/shared-kernel';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';

@Injectable()
export class AchievementService extends BaseSubResourceService<
  Achievement,
  CreateAchievement,
  UpdateAchievement
> {
  protected readonly entityName = 'Achievement';
  protected readonly sectionType: SectionType = 'achievements';
  protected readonly logger = new Logger(AchievementService.name);

  constructor(
    achievementRepository: AchievementRepository,
    resumesRepository: ResumesRepository,
    eventPublisher: EventPublisher,
  ) {
    super(achievementRepository, resumesRepository, eventPublisher);
  }
}
