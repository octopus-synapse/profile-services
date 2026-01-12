import { Injectable, Logger } from '@nestjs/common';
import { Project } from '@prisma/client';
import { ProjectRepository } from '../repositories/project.repository';
import { ResumesRepository } from '../resumes.repository';
import type {
  CreateProject,
  UpdateProject,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';

@Injectable()
export class ProjectService extends BaseSubResourceService<
  Project,
  CreateProject,
  UpdateProject
> {
  protected readonly entityName = 'Project';
  protected readonly logger = new Logger(ProjectService.name);

  constructor(
    projectRepository: ProjectRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(projectRepository, resumesRepository);
  }
}
