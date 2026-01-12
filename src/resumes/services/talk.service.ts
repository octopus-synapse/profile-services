import { Injectable, Logger } from '@nestjs/common';
import { Talk } from '@prisma/client';
import { TalkRepository } from '../repositories/talk.repository';
import { ResumesRepository } from '../resumes.repository';
import type {
  CreateTalk,
  UpdateTalk,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';

@Injectable()
export class TalkService extends BaseSubResourceService<
  Talk,
  CreateTalk,
  UpdateTalk
> {
  protected readonly entityName = 'Talk';
  protected readonly logger = new Logger(TalkService.name);

  constructor(
    talkRepository: TalkRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(talkRepository, resumesRepository);
  }
}
