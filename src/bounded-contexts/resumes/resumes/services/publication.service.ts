import { Injectable, Logger } from '@nestjs/common';
import { Publication } from '@prisma/client';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import { CreatePublication, EventPublisher, UpdatePublication } from '@/shared-kernel';
import { PublicationRepository } from '../repositories/publication.repository';
import { BaseSubResourceService } from './base';

@Injectable()
export class PublicationService extends BaseSubResourceService<
  Publication,
  CreatePublication,
  UpdatePublication
> {
  protected readonly entityName = 'Publication';
  protected readonly sectionType: SectionType = 'publications';
  protected readonly logger = new Logger(PublicationService.name);

  constructor(
    publicationRepository: PublicationRepository,
    resumesRepository: ResumesRepository,
    eventPublisher: EventPublisher,
  ) {
    super(publicationRepository, resumesRepository, eventPublisher);
  }
}
