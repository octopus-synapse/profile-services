import { Injectable, Logger } from '@nestjs/common';
import { Publication } from '@prisma/client';
import { PublicationRepository } from '../repositories/publication.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreatePublication,
  UpdatePublication,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';

@Injectable()
export class PublicationService extends BaseSubResourceService<
  Publication,
  CreatePublication,
  UpdatePublication
> {
  protected readonly entityName = 'Publication';
  protected readonly logger = new Logger(PublicationService.name);

  constructor(
    publicationRepository: PublicationRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(publicationRepository, resumesRepository);
  }
}
