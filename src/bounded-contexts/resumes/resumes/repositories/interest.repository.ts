import { Injectable, Logger } from '@nestjs/common';
import { Interest } from '@prisma/client';
import type { CreateInterest, UpdateInterest } from '@/shared-kernel';
import { BaseSubResourceRepository, buildCreateData, buildUpdateData, OrderByConfig } from './base';

/**
 * Repository for Interest entities
 *
 * Ordering strategy: User-defined (order field, ascending)
 * Rationale: Interests have no natural chronological order - user control is most appropriate.
 */
@Injectable()
export class InterestRepository extends BaseSubResourceRepository<
  Interest,
  CreateInterest,
  UpdateInterest
> {
  protected readonly logger = new Logger(InterestRepository.name);

  protected getPrismaDelegate() {
    return this.prisma.interest;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'user-defined' };
  }

  protected mapCreate(resumeId: string, dto: CreateInterest, order: number) {
    return buildCreateData({ resumeId, order: order }, dto, {
      name: 'string',
      description: 'optional',
    });
  }

  protected mapUpdate(dto: UpdateInterest) {
    return buildUpdateData(dto, {
      name: 'string',
      description: 'optional',
      order: 'number',
    });
  }
}
