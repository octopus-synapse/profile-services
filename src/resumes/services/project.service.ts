import { Injectable, Logger } from '@nestjs/common';
import { Project } from '@prisma/client';
import { ProjectRepository } from '../repositories/project.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateProjectDto, UpdateProjectDto } from '../dto/project.dto';
import { BaseSubResourceService } from './base';

@Injectable()
export class ProjectService extends BaseSubResourceService<
  Project,
  CreateProjectDto,
  UpdateProjectDto
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
