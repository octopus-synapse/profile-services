import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LanguageService } from '../services/language.service';
import {
  CreateLanguageDto,
  UpdateLanguageDto,
  LanguageResponseDto,
} from '../dto/language.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Language } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes/:resumeId/languages')
@UseGuards(JwtAuthGuard)
export class LanguageController extends BaseSubResourceController<
  Language,
  CreateLanguageDto,
  UpdateLanguageDto,
  LanguageResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Language,
    CreateLanguageDto,
    UpdateLanguageDto,
    LanguageResponseDto
  > = {
    entityName: 'language',
    entityPluralName: 'languages',
    responseDtoClass: LanguageResponseDto,
    createDtoClass: CreateLanguageDto,
    updateDtoClass: UpdateLanguageDto,
  };

  constructor(languageService: LanguageService) {
    super(languageService);
  }
}
