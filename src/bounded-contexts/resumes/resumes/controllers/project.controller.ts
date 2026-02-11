import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Project } from '@prisma/client';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { CreateProject, UpdateProject } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
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
}
