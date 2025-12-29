import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AwardService } from '../services/award.service';
import {
  CreateAwardDto,
  UpdateAwardDto,
  AwardResponseDto,
} from '../dto/award.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Award } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes/:resumeId/awards')
@UseGuards(JwtAuthGuard)
export class AwardController extends BaseSubResourceController<
  Award,
  CreateAwardDto,
  UpdateAwardDto,
  AwardResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Award,
    CreateAwardDto,
    UpdateAwardDto,
    AwardResponseDto
  > = {
    entityName: 'award',
    entityPluralName: 'awards',
    responseDtoClass: AwardResponseDto,
    createDtoClass: CreateAwardDto,
    updateDtoClass: UpdateAwardDto,
  };

  constructor(awardService: AwardService) {
    super(awardService);
  }
}
