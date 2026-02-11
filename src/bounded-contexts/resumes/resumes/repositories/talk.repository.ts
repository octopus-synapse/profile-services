import { Injectable, Logger } from '@nestjs/common';
import { Talk } from '@prisma/client';
import type { CreateTalk, UpdateTalk } from '@/shared-kernel';
import { BaseSubResourceRepository, buildCreateData, buildUpdateData, OrderByConfig } from './base';

/**
 * Repository for Talk entities
 *
 * Ordering strategy: Date-based (date DESC, most recent first)
 * Rationale: Talks are chronological events - most recent should appear first.
 */
@Injectable()
export class TalkRepository extends BaseSubResourceRepository<Talk, CreateTalk, UpdateTalk> {
  protected readonly logger = new Logger(TalkRepository.name);

  protected getPrismaDelegate() {
    return this.prisma.talk;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'date-desc', field: 'date' };
  }

  protected mapCreate(resumeId: string, dto: CreateTalk, order: number) {
    return buildCreateData({ resumeId, order: order }, dto, {
      title: 'string',
      event: 'string',
      eventType: 'string',
      location: 'optional',
      date: 'date',
      description: 'optional',
      slidesUrl: 'optional',
      videoUrl: 'optional',
      attendees: 'number',
    });
  }

  protected mapUpdate(dto: UpdateTalk) {
    return buildUpdateData(dto, {
      title: 'string',
      event: 'string',
      eventType: 'string',
      location: 'optional',
      date: 'date',
      description: 'optional',
      slidesUrl: 'optional',
      videoUrl: 'optional',
      attendees: 'number',
      order: 'number',
    });
  }
}
