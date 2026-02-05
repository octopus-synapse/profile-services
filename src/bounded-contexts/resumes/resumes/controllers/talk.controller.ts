import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { TalkService } from '../services/talk.service';
import type { CreateTalk, UpdateTalk } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Talk } from '@prisma/client';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/talks')
@UseGuards(JwtAuthGuard)
export class TalkController extends BaseSubResourceController<
  Talk,
  CreateTalk,
  UpdateTalk,
  Talk
> {
  protected readonly config: SubResourceControllerConfig<
    Talk,
    CreateTalk,
    UpdateTalk,
    Talk
  > = {
    entityName: 'talk',
    entityPluralName: 'talks',
  };

  constructor(talkService: TalkService) {
    super(talkService);
  }
}
