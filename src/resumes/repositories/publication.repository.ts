import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Publication } from '@prisma/client';
import {
  CreatePublicationDto,
  UpdatePublicationDto,
} from '../dto/publication.dto';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Publication entities
 *
 * Ordering strategy: Date-based (publishedAt DESC, most recent first)
 * Rationale: Publications are chronological - most recent should appear first.
 */
@Injectable()
export class PublicationRepository extends BaseSubResourceRepository<
  Publication,
  CreatePublicationDto,
  UpdatePublicationDto
> {
  protected readonly logger = new Logger(PublicationRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.publication;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'date-desc', field: 'publishedAt' };
  }

  protected mapCreateDto(
    resumeId: string,
    dto: CreatePublicationDto,
    order: number,
  ) {
    return buildCreateData({ resumeId, order: dto.order ?? order }, dto, {
      title: 'string',
      publisher: 'string',
      publicationType: 'string',
      url: 'optional',
      publishedAt: 'date',
      abstract: 'optional',
      coAuthors: { type: 'array', default: [] },
      citations: { type: 'number', default: 0 },
    });
  }

  protected mapUpdateDto(dto: UpdatePublicationDto) {
    return buildUpdateData(dto, {
      title: 'string',
      publisher: 'string',
      publicationType: 'string',
      url: 'optional',
      publishedAt: 'date',
      abstract: 'optional',
      coAuthors: 'array',
      citations: 'number',
      order: 'number',
    });
  }
}
