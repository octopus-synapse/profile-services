import { Injectable, Logger } from '@nestjs/common';
import { Interest } from '@prisma/client';
import { InterestRepository } from '../repositories/interest.repository';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import type { CreateInterest, UpdateInterest } from '@/shared-kernel';
import { BaseSubResourceService } from './base';
import { EventPublisher } from '@/shared-kernel';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';

@Injectable()
export class InterestService extends BaseSubResourceService<
  Interest,
  CreateInterest,
  UpdateInterest
> {
  protected readonly entityName = 'Interest';
  protected readonly sectionType: SectionType = 'interests';
  protected readonly logger = new Logger(InterestService.name);

  constructor(
    interestRepository: InterestRepository,
    resumesRepository: ResumesRepository,
    eventPublisher: EventPublisher,
  ) {
    super(interestRepository, resumesRepository, eventPublisher);
  }
}
