import { Injectable, Logger } from '@nestjs/common';
import { Hackathon } from '@prisma/client';
import { HackathonRepository } from '../repositories/hackathon.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateHackathonDto, UpdateHackathonDto } from '../dto/hackathon.dto';
import { BaseSubResourceService } from './base';

@Injectable()
export class HackathonService extends BaseSubResourceService<
  Hackathon,
  CreateHackathonDto,
  UpdateHackathonDto
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
