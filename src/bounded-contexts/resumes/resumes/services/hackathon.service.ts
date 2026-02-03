import { Injectable, Logger } from '@nestjs/common';
import { Hackathon } from '@prisma/client';
import { HackathonRepository } from '../repositories/hackathon.repository';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import type {
  CreateHackathon,
  UpdateHackathon,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';
import { EventPublisher } from '@/shared-kernel';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';

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
