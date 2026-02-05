import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { LanguageService } from '../services/language.service';
import type {
  CreateLanguage,
  UpdateLanguage,
} from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Language } from '@prisma/client';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
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
