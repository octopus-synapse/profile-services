import { Injectable, Logger } from '@nestjs/common';
import { Achievement } from '@prisma/client';
import { CreateAchievement, UpdateAchievement } from '@/shared-kernel';
import { BaseSubResourceRepository, buildCreateData, buildUpdateData, OrderByConfig } from './base';

/**
 * Repository for Achievement entities
 *
 * Ordering strategy: User-defined (order field, ascending)
 * Rationale: Achievements have no natural chronological order - user control is most appropriate.
 */
@Injectable()
export class AchievementRepository extends BaseSubResourceRepository<
  Achievement,
  CreateAchievement,
  UpdateAchievement
> {
  protected readonly logger = new Logger(AchievementRepository.name);

  protected getPrismaDelegate() {
    return this.prisma.achievement;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'user-defined' };
  }

  protected mapCreate(resumeId: string, dto: CreateAchievement, order: number) {
    return buildCreateData({ resumeId, order: order }, dto, {
      type: 'string',
      title: 'string',
      description: 'optional',
      badgeUrl: 'optional',
      verificationUrl: 'optional',
      achievedAt: 'date',
      value: 'number',
      rank: 'optional',
    });
  }

  protected mapUpdate(dto: UpdateAchievement) {
    return buildUpdateData(dto, {
      type: 'string',
      title: 'string',
      description: 'optional',
      badgeUrl: 'optional',
      verificationUrl: 'optional',
      achievedAt: 'date',
      value: 'number',
      rank: 'optional',
      order: 'number',
    });
  }
}
