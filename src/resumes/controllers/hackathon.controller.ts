import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { HackathonService } from '../services/hackathon.service';
import {
  CreateHackathonDto,
  UpdateHackathonDto,
  HackathonResponseDto,
} from '../dto/hackathon.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Hackathon } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes/:resumeId/hackathons')
@UseGuards(JwtAuthGuard)
export class HackathonController extends BaseSubResourceController<
  Hackathon,
  CreateHackathonDto,
  UpdateHackathonDto,
  HackathonResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Hackathon,
    CreateHackathonDto,
    UpdateHackathonDto,
    HackathonResponseDto
  > = {
    entityName: 'hackathon',
    entityPluralName: 'hackathons',
    responseDtoClass: HackathonResponseDto,
    createDtoClass: CreateHackathonDto,
    updateDtoClass: UpdateHackathonDto,
  };

  constructor(hackathonService: HackathonService) {
    super(hackathonService);
  }
}
