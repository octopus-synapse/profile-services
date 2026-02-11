import { Injectable, Logger } from '@nestjs/common';
import { Achievement } from '@prisma/client';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';
import { CreateAchievement, UpdateAchievement } from '@/shared-kernel';
import { BaseSubResourceService } from './base';

@Injectable()
export class AchievementService extends BaseSubResourceService<
  Achievement,
  CreateAchievement,
  UpdateAchievement
> {
  protected readonly entityName = 'Achievement';
  protected readonly sectionType: SectionType = 'achievements';
  protected readonly logger = new Logger(AchievementService.name);
}
