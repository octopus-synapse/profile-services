import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Award } from '@prisma/client';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { CreateAward, UpdateAward } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';

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
  protected readonly config: SubResourceControllerConfig<Award, CreateAward, UpdateAward, Award> = {
    entityName: 'award',
    entityPluralName: 'awards',
  };
}
