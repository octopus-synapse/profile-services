import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Talk } from '@prisma/client';
import { CreateTalkDto, UpdateTalkDto } from '../dto/talk.dto';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Talk entities
 *
 * Ordering strategy: Date-based (date DESC, most recent first)
 * Rationale: Talks are chronological events - most recent should appear first.
 */
@Injectable()
export class TalkRepository extends BaseSubResourceRepository<
  Talk,
  CreateTalkDto,
  UpdateTalkDto
> {
  protected readonly logger = new Logger(TalkRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.talk;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'date-desc', field: 'date' };
  }

  protected mapCreateDto(resumeId: string, dto: CreateTalkDto, order: number) {
    return buildCreateData({ resumeId, order: dto.order ?? order }, dto, {
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

  protected mapUpdateDto(dto: UpdateTalkDto) {
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
