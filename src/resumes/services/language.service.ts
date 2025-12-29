import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { LanguageRepository } from '../repositories/language.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateLanguageDto, UpdateLanguageDto } from '../dto/language.dto';
import { BaseSubResourceService } from './base';

@Injectable()
export class LanguageService extends BaseSubResourceService<
  Language,
  CreateLanguageDto,
  UpdateLanguageDto
> {
  protected readonly entityName = 'Language';
  protected readonly logger = new Logger(LanguageService.name);

  constructor(
    languageRepository: LanguageRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(languageRepository, resumesRepository);
  }
}
