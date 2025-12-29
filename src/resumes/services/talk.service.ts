import { Injectable, Logger } from '@nestjs/common';
import { Talk } from '@prisma/client';
import { TalkRepository } from '../repositories/talk.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateTalkDto, UpdateTalkDto } from '../dto/talk.dto';
import { BaseSubResourceService } from './base';

@Injectable()
export class TalkService extends BaseSubResourceService<
  Talk,
  CreateTalkDto,
  UpdateTalkDto
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
