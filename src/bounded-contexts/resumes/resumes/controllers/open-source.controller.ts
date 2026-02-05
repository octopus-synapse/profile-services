import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { OpenSourceService } from '../services/open-source.service';
import type { CreateOpenSource, UpdateOpenSource } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { OpenSourceContribution } from '@prisma/client';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/open-sources')
@UseGuards(JwtAuthGuard)
export class OpenSourceController extends BaseSubResourceController<
  OpenSourceContribution,
  CreateOpenSource,
  UpdateOpenSource,
  OpenSourceContribution
> {
  protected readonly config: SubResourceControllerConfig<
    OpenSourceContribution,
    CreateOpenSource,
    UpdateOpenSource,
    OpenSourceContribution
  > = {
    entityName: 'open source contribution',
    entityPluralName: 'open source contributions',
  };

  constructor(openSourceService: OpenSourceService) {
    super(openSourceService);
  }
}
