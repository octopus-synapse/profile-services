import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { ExperienceService } from '../services/experience.service';
import type {
  CreateExperience,
  UpdateExperience,
} from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Experience } from '@prisma/client';

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

  constructor(experienceService: ExperienceService) {
    super(experienceService);
  }
}
