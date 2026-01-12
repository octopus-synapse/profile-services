import { Injectable, Logger } from '@nestjs/common';
import { Hackathon } from '@prisma/client';
import { HackathonRepository } from '../repositories/hackathon.repository';
import { ResumesRepository } from '../resumes.repository';
import type {
  CreateHackathon,
  UpdateHackathon,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';

@Injectable()
export class HackathonService extends BaseSubResourceService<
  Hackathon,
  CreateHackathon,
  UpdateHackathon
> {
  protected readonly entityName = 'Hackathon';
  protected readonly logger = new Logger(HackathonService.name);

  constructor(
    hackathonRepository: HackathonRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(hackathonRepository, resumesRepository);
  }
}
