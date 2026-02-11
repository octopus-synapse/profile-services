import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Experience } from '@prisma/client';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { CreateExperience, UpdateExperience } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';

/**
 * Controller for managing resume experiences
 *
 * Extends BaseSubResourceController to inherit common CRUD endpoints:
 * - GET /resumes/:resumeId/experiences - List all experiences
 * - GET /resumes/:resumeId/experiences/:id - Get a specific experience
 * - POST /resumes/:resumeId/experiences - Create a new experience
 * - PATCH /resumes/:resumeId/experiences/:id - Update an experience
 * - DELETE /resumes/:resumeId/experiences/:id - Delete an experience
 * - POST /resumes/:resumeId/experiences/reorder - Reorder experiences
 */
@SdkExport({ tag: 'resumes', description: 'Resumes API' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/experiences')
@UseGuards(JwtAuthGuard)
export class ExperienceController extends BaseSubResourceController<
  Experience,
  CreateExperience,
  UpdateExperience,
  Experience
> {
  protected readonly config: SubResourceControllerConfig<
    Experience,
    CreateExperience,
    UpdateExperience,
    Experience
  > = {
    entityName: 'experience',
    entityPluralName: 'experiences',
  };
}
