import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PublicationService } from '../services/publication.service';
import {
  CreatePublicationDto,
  UpdatePublicationDto,
  PublicationResponseDto,
} from '../dto/publication.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Publication } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes/:resumeId/publications')
@UseGuards(JwtAuthGuard)
export class PublicationController extends BaseSubResourceController<
  Publication,
  CreatePublicationDto,
  UpdatePublicationDto,
  PublicationResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Publication,
    CreatePublicationDto,
    UpdatePublicationDto,
    PublicationResponseDto
  > = {
    entityName: 'publication',
    entityPluralName: 'publications',
    responseDtoClass: PublicationResponseDto,
    createDtoClass: CreatePublicationDto,
    updateDtoClass: UpdatePublicationDto,
  };

  constructor(publicationService: PublicationService) {
    super(publicationService);
  }
}
