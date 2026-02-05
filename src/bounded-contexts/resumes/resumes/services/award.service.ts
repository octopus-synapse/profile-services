import { Injectable, Logger } from '@nestjs/common';
import { Award } from '@prisma/client';
import { AwardRepository } from '../repositories/award.repository';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import type { CreateAward, UpdateAward } from '@/shared-kernel';
import { BaseSubResourceService } from './base';
import { EventPublisher } from '@/shared-kernel';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';

@Injectable()
export class AwardService extends BaseSubResourceService<
  Award,
  CreateAward,
  UpdateAward
> {
  protected readonly entityName = 'Award';
  protected readonly sectionType: SectionType = 'awards';
  protected readonly logger = new Logger(AwardService.name);

  constructor(
    awardRepository: AwardRepository,
    resumesRepository: ResumesRepository,
    eventPublisher: EventPublisher,
  ) {
    super(awardRepository, resumesRepository, eventPublisher);
  }
}
