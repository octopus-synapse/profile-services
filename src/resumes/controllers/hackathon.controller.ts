import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { HackathonService } from '../services/hackathon.service';
import type {
  CreateHackathon,
  UpdateHackathon,
} from '@octopus-synapse/profile-contracts';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Hackathon } from '@prisma/client';

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
