import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InterestService } from '../services/interest.service';
import type {
  CreateInterest,
  UpdateInterest,
} from '@octopus-synapse/profile-contracts';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Interest } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/interests')
@UseGuards(JwtAuthGuard)
export class InterestController extends BaseSubResourceController<
  Interest,
  CreateInterest,
  UpdateInterest,
  Interest
> {
  protected readonly config: SubResourceControllerConfig<
    Interest,
    CreateInterest,
    UpdateInterest,
    Interest
  > = {
    entityName: 'interest',
    entityPluralName: 'interests',
  };

  constructor(interestService: InterestService) {
    super(interestService);
  }
}
