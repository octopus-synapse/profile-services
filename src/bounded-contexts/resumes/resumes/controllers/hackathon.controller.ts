import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Hackathon } from '@prisma/client';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { CreateHackathon, UpdateHackathon } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/hackathons')
@UseGuards(JwtAuthGuard)
export class HackathonController extends BaseSubResourceController<
  Hackathon,
  CreateHackathon,
  UpdateHackathon,
  Hackathon
> {
  protected readonly config: SubResourceControllerConfig<
    Hackathon,
    CreateHackathon,
    UpdateHackathon,
    Hackathon
  > = {
    entityName: 'hackathon',
    entityPluralName: 'hackathons',
  };
}
