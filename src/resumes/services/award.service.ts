import { Injectable, Logger } from '@nestjs/common';
import { Award } from '@prisma/client';
import { AwardRepository } from '../repositories/award.repository';
import { ResumesRepository } from '../resumes.repository';
import type {
  CreateAward,
  UpdateAward,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';

@Injectable()
export class AwardService extends BaseSubResourceService<
  Award,
  CreateAward,
  UpdateAward
> {
  protected readonly entityName = 'Award';
  protected readonly logger = new Logger(AwardService.name);

  constructor(
    awardRepository: AwardRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(awardRepository, resumesRepository);
  }
}
