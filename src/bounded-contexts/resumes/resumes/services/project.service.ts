import { Injectable, Logger } from '@nestjs/common';
import { Project } from '@prisma/client';
import { ProjectRepository } from '../repositories/project.repository';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import type {
  CreateProject,
  UpdateProject,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';
import { EventPublisher } from '@/shared-kernel';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';

@Injectable()
export class ProjectService extends BaseSubResourceService<
  Project,
  CreateProject,
  UpdateProject
> {
  protected readonly entityName = 'Project';
  protected readonly sectionType: SectionType = 'projects';
  protected readonly logger = new Logger(ProjectService.name);

  constructor(
    projectRepository: ProjectRepository,
    resumesRepository: ResumesRepository,
    eventPublisher: EventPublisher,
  ) {
    super(projectRepository, resumesRepository, eventPublisher);
  }
}
