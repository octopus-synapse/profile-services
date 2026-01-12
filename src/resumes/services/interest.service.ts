import { Injectable, Logger } from '@nestjs/common';
import { Interest } from '@prisma/client';
import { InterestRepository } from '../repositories/interest.repository';
import { ResumesRepository } from '../resumes.repository';
import type {
  CreateInterest,
  UpdateInterest,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';

@Injectable()
export class InterestService extends BaseSubResourceService<
  Interest,
  CreateInterest,
  UpdateInterest
> {
  protected readonly entityName = 'Interest';
  protected readonly logger = new Logger(InterestService.name);

  constructor(
    interestRepository: InterestRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(interestRepository, resumesRepository);
  }
}
