import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TalkService } from '../services/talk.service';
import { CreateTalkDto, UpdateTalkDto, TalkResponseDto } from '../dto/talk.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Talk } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/talks')
@UseGuards(JwtAuthGuard)
export class TalkController extends BaseSubResourceController<
  Talk,
  CreateTalkDto,
  UpdateTalkDto,
  TalkResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Talk,
    CreateTalkDto,
    UpdateTalkDto,
    TalkResponseDto
  > = {
    entityName: 'talk',
    entityPluralName: 'talks',
    responseDtoClass: TalkResponseDto,
    createDtoClass: CreateTalkDto,
    updateDtoClass: UpdateTalkDto,
  };

  constructor(talkService: TalkService) {
    super(talkService);
  }
}
