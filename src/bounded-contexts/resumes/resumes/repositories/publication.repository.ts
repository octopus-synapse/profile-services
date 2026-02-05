import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { Publication } from '@prisma/client';
import { CreatePublication, UpdatePublication } from '@/shared-kernel';
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
  CreatePublication,
  UpdatePublication
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

  protected mapCreate(resumeId: string, dto: CreatePublication, order: number) {
    return buildCreateData({ resumeId, order: order }, dto, {
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

  protected mapUpdate(dto: UpdatePublication) {
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
