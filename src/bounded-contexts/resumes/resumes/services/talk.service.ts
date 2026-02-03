import { Injectable, Logger } from '@nestjs/common';
import { Talk } from '@prisma/client';
import { TalkRepository } from '../repositories/talk.repository';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import type {
  CreateTalk,
  UpdateTalk,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';
import { EventPublisher } from '@/shared-kernel';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';

@Injectable()
export class TalkService extends BaseSubResourceService<
  Talk,
  CreateTalk,
  UpdateTalk
> {
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
