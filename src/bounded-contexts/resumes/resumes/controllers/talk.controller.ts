import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Talk } from '@prisma/client';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { CreateTalk, UpdateTalk } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/talks')
@UseGuards(JwtAuthGuard)
export class TalkController extends BaseSubResourceController<Talk, CreateTalk, UpdateTalk, Talk> {
  protected readonly config: SubResourceControllerConfig<Talk, CreateTalk, UpdateTalk, Talk> = {
    entityName: 'talk',
    entityPluralName: 'talks',
  };
}
