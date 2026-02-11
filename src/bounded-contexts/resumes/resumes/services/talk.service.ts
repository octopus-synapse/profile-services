import { Injectable, Logger } from '@nestjs/common';
import { Talk } from '@prisma/client';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import type { CreateTalk, UpdateTalk } from '@/shared-kernel';
import { EventPublisher } from '@/shared-kernel';
import { TalkRepository } from '../repositories/talk.repository';
import { BaseSubResourceService } from './base';

@Injectable()
export class TalkService extends BaseSubResourceService<Talk, CreateTalk, UpdateTalk> {
  protected readonly entityName = 'Talk';
  protected readonly sectionType: SectionType = 'talks';
  protected readonly logger = new Logger(TalkService.name);

  constructor(
    talkRepository: TalkRepository,
    resumesRepository: ResumesRepository,
    eventPublisher: EventPublisher,
  ) {
    super(talkRepository, resumesRepository, eventPublisher);
  }
}
