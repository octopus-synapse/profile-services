import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { BugBountyService } from '../services/bug-bounty.service';
import type { CreateBugBounty, UpdateBugBounty } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { BugBounty } from '@prisma/client';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
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
