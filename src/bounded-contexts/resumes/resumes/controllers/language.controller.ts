import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Language } from '@prisma/client';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { CreateLanguage, UpdateLanguage } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';

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
}
