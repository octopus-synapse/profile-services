import { Injectable, Logger } from '@nestjs/common';
import { Experience } from '@prisma/client';
import { ExperienceRepository } from '../repositories/experience.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateExperienceDto,
  UpdateExperienceDto,
} from '../dto/experience.dto';
import { BaseSubResourceService } from './base';

@Injectable()
export class ExperienceService extends BaseSubResourceService<
  Experience,
  CreateExperienceDto,
  UpdateExperienceDto
> {
  protected readonly entityName = 'Experience';
  protected readonly logger = new Logger(ExperienceService.name);

  constructor(
    experienceRepository: ExperienceRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(experienceRepository, resumesRepository);
  }
}
