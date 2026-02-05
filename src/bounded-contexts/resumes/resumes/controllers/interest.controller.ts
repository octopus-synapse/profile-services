import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { InterestService } from '../services/interest.service';
import type { CreateInterest, UpdateInterest } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Interest } from '@prisma/client';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
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
