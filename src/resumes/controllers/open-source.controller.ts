import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OpenSourceService } from '../services/open-source.service';
import {
  CreateOpenSourceDto,
  UpdateOpenSourceDto,
  OpenSourceResponseDto,
} from '../dto/open-source.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { OpenSourceContribution } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/open-sources')
@UseGuards(JwtAuthGuard)
export class OpenSourceController extends BaseSubResourceController<
  OpenSourceContribution,
  CreateOpenSourceDto,
  UpdateOpenSourceDto,
  OpenSourceResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    OpenSourceContribution,
    CreateOpenSourceDto,
    UpdateOpenSourceDto,
    OpenSourceResponseDto
  > = {
    entityName: 'open source contribution',
    entityPluralName: 'open source contributions',
    responseDtoClass: OpenSourceResponseDto,
    createDtoClass: CreateOpenSourceDto,
    updateDtoClass: UpdateOpenSourceDto,
  };

  constructor(openSourceService: OpenSourceService) {
    super(openSourceService);
  }
}
