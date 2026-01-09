import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Achievement } from '@prisma/client';
import {
  CreateAchievementDto,
  UpdateAchievementDto,
} from '../dto/achievement.dto';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Achievement entities
 *
 * Ordering strategy: User-defined (order field, ascending)
 * Rationale: Achievements have no natural chronological order - user control is most appropriate.
 */
@Injectable()
export class AchievementRepository extends BaseSubResourceRepository<
  Achievement,
  CreateAchievementDto,
  UpdateAchievementDto
> {
  protected readonly logger = new Logger(AchievementRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.achievement;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'user-defined' };
  }

  protected mapCreateDto(
    resumeId: string,
    dto: CreateAchievementDto,
    order: number,
  ) {
    return buildCreateData({ resumeId, order: dto.order ?? order }, dto, {
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

  protected mapUpdateDto(dto: UpdateAchievementDto) {
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
