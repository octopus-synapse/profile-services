import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { AwardService } from '../services/award.service';
import type { CreateAward, UpdateAward } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Award } from '@prisma/client';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/awards')
@UseGuards(JwtAuthGuard)
export class AwardController extends BaseSubResourceController<
  Award,
  CreateAward,
  UpdateAward,
  Award
> {
  protected readonly config: SubResourceControllerConfig<
    Award,
    CreateAward,
    UpdateAward,
    Award
  > = {
    entityName: 'award',
    entityPluralName: 'awards',
  };

  constructor(awardService: AwardService) {
    super(awardService);
  }
}
