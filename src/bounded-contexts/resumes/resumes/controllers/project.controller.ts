import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { ProjectService } from '../services/project.service';
import type {
  CreateProject,
  UpdateProject,
} from '@octopus-synapse/profile-contracts';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Project } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/projects')
@UseGuards(JwtAuthGuard)
export class ProjectController extends BaseSubResourceController<
  Project,
  CreateProject,
  UpdateProject,
  Project
> {
  protected readonly config: SubResourceControllerConfig<
    Project,
    CreateProject,
    UpdateProject,
    Project
  > = {
    entityName: 'project',
    entityPluralName: 'projects',
  };

  constructor(projectService: ProjectService) {
    super(projectService);
  }
}
