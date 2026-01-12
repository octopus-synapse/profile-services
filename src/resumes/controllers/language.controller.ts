import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LanguageService } from '../services/language.service';
import type {
  CreateLanguage,
  UpdateLanguage,
} from '@octopus-synapse/profile-contracts';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Language } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/languages')
@UseGuards(JwtAuthGuard)
export class LanguageController extends BaseSubResourceController<
  Language,
  CreateLanguage,
  UpdateLanguage,
  Language
> {
  protected readonly config: SubResourceControllerConfig<
    Language,
    CreateLanguage,
    UpdateLanguage,
    Language
  > = {
    entityName: 'language',
    entityPluralName: 'languages',
  };

  constructor(languageService: LanguageService) {
    super(languageService);
  }
}
