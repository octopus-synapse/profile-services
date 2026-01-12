import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { LanguageRepository } from '../repositories/language.repository';
import { ResumesRepository } from '../resumes.repository';
import type {
  CreateLanguage,
  UpdateLanguage,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';

@Injectable()
export class LanguageService extends BaseSubResourceService<
  Language,
  CreateLanguage,
  UpdateLanguage
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
