import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EducationService } from '../services/education.service';
import {
  CreateEducationDto,
  UpdateEducationDto,
  EducationResponseDto,
} from '../dto/education.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Education } from '@prisma/client';

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
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes/:resumeId/education')
@UseGuards(JwtAuthGuard)
export class EducationController extends BaseSubResourceController<
  Education,
  CreateEducationDto,
  UpdateEducationDto,
  EducationResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Education,
    CreateEducationDto,
    UpdateEducationDto,
    EducationResponseDto
  > = {
    entityName: 'education',
    entityPluralName: 'education entries',
    responseDtoClass: EducationResponseDto,
    createDtoClass: CreateEducationDto,
    updateDtoClass: UpdateEducationDto,
  };

  constructor(educationService: EducationService) {
    super(educationService);
  }
}
