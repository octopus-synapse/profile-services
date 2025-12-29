import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InterestService } from '../services/interest.service';
import {
  CreateInterestDto,
  UpdateInterestDto,
  InterestResponseDto,
} from '../dto/interest.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Interest } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes/:resumeId/interests')
@UseGuards(JwtAuthGuard)
export class InterestController extends BaseSubResourceController<
  Interest,
  CreateInterestDto,
  UpdateInterestDto,
  InterestResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Interest,
    CreateInterestDto,
    UpdateInterestDto,
    InterestResponseDto
  > = {
    entityName: 'interest',
    entityPluralName: 'interests',
    responseDtoClass: InterestResponseDto,
    createDtoClass: CreateInterestDto,
    updateDtoClass: UpdateInterestDto,
  };

  constructor(interestService: InterestService) {
    super(interestService);
  }
}
