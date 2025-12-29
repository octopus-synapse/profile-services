import { Injectable, Logger } from '@nestjs/common';
import { Award } from '@prisma/client';
import { AwardRepository } from '../repositories/award.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateAwardDto, UpdateAwardDto } from '../dto/award.dto';
import { BaseSubResourceService } from './base';

@Injectable()
export class AwardService extends BaseSubResourceService<
  Award,
  CreateAwardDto,
  UpdateAwardDto
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
