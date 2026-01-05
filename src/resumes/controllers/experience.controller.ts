import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExperienceService } from '../services/experience.service';
import {
  CreateExperienceDto,
  UpdateExperienceDto,
  ExperienceResponseDto,
} from '../dto/experience.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Experience } from '@prisma/client';

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
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/experiences')
@UseGuards(JwtAuthGuard)
export class ExperienceController extends BaseSubResourceController<
  Experience,
  CreateExperienceDto,
  UpdateExperienceDto,
  ExperienceResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Experience,
    CreateExperienceDto,
    UpdateExperienceDto,
    ExperienceResponseDto
  > = {
    entityName: 'experience',
    entityPluralName: 'experiences',
    responseDtoClass: ExperienceResponseDto,
    createDtoClass: CreateExperienceDto,
    updateDtoClass: UpdateExperienceDto,
  };

  constructor(experienceService: ExperienceService) {
    super(experienceService);
  }
}
