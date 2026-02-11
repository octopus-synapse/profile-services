import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import type { CreateLanguage, UpdateLanguage } from '@/shared-kernel';
import { EventPublisher } from '@/shared-kernel';
import { LanguageRepository } from '../repositories/language.repository';
import { BaseSubResourceService } from './base';

@Injectable()
export class LanguageService extends BaseSubResourceService<
  Language,
  CreateLanguage,
  UpdateLanguage
> {
  protected readonly entityName = 'Language';
  protected readonly sectionType: SectionType = 'languages';
  protected readonly logger = new Logger(LanguageService.name);

  constructor(
    languageRepository: LanguageRepository,
    resumesRepository: ResumesRepository,
    eventPublisher: EventPublisher,
  ) {
    super(languageRepository, resumesRepository, eventPublisher);
  }
}
