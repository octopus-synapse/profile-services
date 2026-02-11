import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { OpenSourceContribution } from '@prisma/client';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { CreateOpenSource, UpdateOpenSource } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';

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
}
