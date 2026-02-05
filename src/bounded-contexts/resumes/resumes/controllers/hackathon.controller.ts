import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { HackathonService } from '../services/hackathon.service';
import type { CreateHackathon, UpdateHackathon } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Hackathon } from '@prisma/client';

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

  constructor(hackathonService: HackathonService) {
    super(hackathonService);
  }
}
