import { Injectable, Logger } from '@nestjs/common';
import { Hackathon } from '@prisma/client';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import type { CreateHackathon, UpdateHackathon } from '@/shared-kernel';
import { EventPublisher } from '@/shared-kernel';
import { HackathonRepository } from '../repositories/hackathon.repository';
import { BaseSubResourceService } from './base';

@Injectable()
export class HackathonService extends BaseSubResourceService<
  Hackathon,
  CreateHackathon,
  UpdateHackathon
> {
  protected readonly entityName = 'Hackathon';
  protected readonly sectionType: SectionType = 'hackathons';
  protected readonly logger = new Logger(HackathonService.name);

  constructor(
    hackathonRepository: HackathonRepository,
    resumesRepository: ResumesRepository,
    eventPublisher: EventPublisher,
  ) {
    super(hackathonRepository, resumesRepository, eventPublisher);
  }
}
