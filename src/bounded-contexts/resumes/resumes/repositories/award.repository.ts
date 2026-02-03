import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { Award } from '@prisma/client';
import type {
  CreateAward,
  UpdateAward,
} from '@octopus-synapse/profile-contracts';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Award entities
 *
 * Ordering strategy: Date-based (date DESC, most recent first)
 * Rationale: Awards are chronological achievements - most recent should appear first.
 */
@Injectable()
export class AwardRepository extends BaseSubResourceRepository<
  Award,
  CreateAward,
  UpdateAward
> {
  protected readonly logger = new Logger(AwardRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.award;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'date-desc', field: 'date' };
  }

  protected mapCreate(resumeId: string, dto: CreateAward, order: number) {
    return buildCreateData({ resumeId, order: order }, dto, {
      title: 'string',
      issuer: 'string',
      date: 'date',
      description: 'optional',
    });
  }

  protected mapUpdate(dto: UpdateAward) {
    return buildUpdateData(dto, {
      title: 'string',
      issuer: 'string',
      date: 'date',
      description: 'optional',
      order: 'number',
    });
  }
}
