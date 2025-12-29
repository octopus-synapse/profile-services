import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectService } from '../services/project.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
} from '../dto/project.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Project } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes/:resumeId/projects')
@UseGuards(JwtAuthGuard)
export class ProjectController extends BaseSubResourceController<
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Project,
    CreateProjectDto,
    UpdateProjectDto,
    ProjectResponseDto
  > = {
    entityName: 'project',
    entityPluralName: 'projects',
    responseDtoClass: ProjectResponseDto,
    createDtoClass: CreateProjectDto,
    updateDtoClass: UpdateProjectDto,
  };

  constructor(projectService: ProjectService) {
    super(projectService);
  }
}
