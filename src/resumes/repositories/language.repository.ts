import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Language } from '@prisma/client';
import type {
  CreateLanguage,
  UpdateLanguage,
} from '@octopus-synapse/profile-contracts';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Language entities
 *
 * Ordering strategy: User-defined (order field, ascending)
 * Rationale: Languages should be ordered by proficiency or preference as the user decides.
 * Unlike date-based entities, there is no natural chronological order for languages,
 * so explicit user control via the order field is the most appropriate strategy.
 */
@Injectable()
export class LanguageRepository extends BaseSubResourceRepository<
  Language,
  CreateLanguage,
  UpdateLanguage
> {
  protected readonly logger = new Logger(LanguageRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.language;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'user-defined' };
  }

  protected mapCreate(resumeId: string, dto: CreateLanguage, order: number) {
    return buildCreateData({ resumeId, order: dto.order ?? order }, dto, {
      name: 'string',
      level: 'string',
      cefrLevel: { type: 'optional', default: null },
    });
  }

  protected mapUpdate(dto: UpdateLanguage) {
    return buildUpdateData(dto, {
      name: 'string',
      level: 'string',
      cefrLevel: 'optional',
      order: 'number',
    });
  }
}
