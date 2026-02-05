import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { LanguageRepository } from '../repositories/language.repository';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import type { CreateLanguage, UpdateLanguage } from '@/shared-kernel';
import { BaseSubResourceService } from './base';
import { EventPublisher } from '@/shared-kernel';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';

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
