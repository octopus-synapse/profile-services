import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { PublicationService } from '../services/publication.service';
import type {
  CreatePublication,
  UpdatePublication,
} from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Publication } from '@prisma/client';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/publications')
@UseGuards(JwtAuthGuard)
export class PublicationController extends BaseSubResourceController<
  Publication,
  CreatePublication,
  UpdatePublication,
  Publication
> {
  protected readonly config: SubResourceControllerConfig<
    Publication,
    CreatePublication,
    UpdatePublication,
    Publication
  > = {
    entityName: 'publication',
    entityPluralName: 'publications',
  };

  constructor(publicationService: PublicationService) {
    super(publicationService);
  }
}
