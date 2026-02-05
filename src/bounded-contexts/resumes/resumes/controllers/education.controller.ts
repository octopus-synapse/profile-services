import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { EducationService } from '../services/education.service';
import type {
  CreateEducation,
  UpdateEducation,
} from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Education } from '@prisma/client';

/**
 * Controller for managing resume education entries
 *
 * Extends BaseSubResourceController to inherit common CRUD endpoints:
 * - GET /resumes/:resumeId/education - List all education entries
 * - GET /resumes/:resumeId/education/:id - Get a specific education entry
 * - POST /resumes/:resumeId/education - Create a new education entry
 * - PATCH /resumes/:resumeId/education/:id - Update an education entry
 * - DELETE /resumes/:resumeId/education/:id - Delete an education entry
 * - POST /resumes/:resumeId/education/reorder - Reorder education entries
 */
@SdkExport({ tag: 'resumes', description: 'Resumes API' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/education')
@UseGuards(JwtAuthGuard)
export class EducationController extends BaseSubResourceController<
  Education,
  CreateEducation,
  UpdateEducation,
  Education
> {
  protected readonly config: SubResourceControllerConfig<
    Education,
    CreateEducation,
    UpdateEducation,
    Education
  > = {
    entityName: 'education',
    entityPluralName: 'education entries',
  };

  constructor(educationService: EducationService) {
    super(educationService);
  }
}
