import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BugBountyService } from '../services/bug-bounty.service';
import {
  CreateBugBountyDto,
  UpdateBugBountyDto,
  BugBountyResponseDto,
} from '../dto/bug-bounty.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { BugBounty } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes/:resumeId/bug-bounties')
@UseGuards(JwtAuthGuard)
export class BugBountyController extends BaseSubResourceController<
  BugBounty,
  CreateBugBountyDto,
  UpdateBugBountyDto,
  BugBountyResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    BugBounty,
    CreateBugBountyDto,
    UpdateBugBountyDto,
    BugBountyResponseDto
  > = {
    entityName: 'bug bounty',
    entityPluralName: 'bug bounties',
    responseDtoClass: BugBountyResponseDto,
    createDtoClass: CreateBugBountyDto,
    updateDtoClass: UpdateBugBountyDto,
  };

  constructor(bugBountyService: BugBountyService) {
    super(bugBountyService);
  }
}
