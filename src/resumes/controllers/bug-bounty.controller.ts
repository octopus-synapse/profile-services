import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BugBountyService } from '../services/bug-bounty.service';
import type {
  CreateBugBounty,
  UpdateBugBounty,
} from '@octopus-synapse/profile-contracts';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { BugBounty } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/bug-bounties')
@UseGuards(JwtAuthGuard)
export class BugBountyController extends BaseSubResourceController<
  BugBounty,
  CreateBugBounty,
  UpdateBugBounty,
  BugBounty
> {
  protected readonly config: SubResourceControllerConfig<
    BugBounty,
    CreateBugBounty,
    UpdateBugBounty,
    BugBounty
  > = {
    entityName: 'bug bounty',
    entityPluralName: 'bug bounties',
  };

  constructor(bugBountyService: BugBountyService) {
    super(bugBountyService);
  }
}
