import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Experience } from '@prisma/client';
import type {
  CreateExperience,
  UpdateExperience,
} from '@octopus-synapse/profile-contracts';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Experience entities
 *
 * Ordering strategy: User-defined (order field, ascending)
 * Rationale: Experiences should be ordered as the user prefers,
 * typically most recent first but allowing manual reordering via drag-and-drop.
 * The order field provides explicit control over display sequence.
 */
@Injectable()
export class ExperienceRepository extends BaseSubResourceRepository<
  Experience,
  CreateExperience,
  UpdateExperience
> {
  protected readonly logger = new Logger(ExperienceRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.experience;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'user-defined' };
  }

  protected mapCreate(resumeId: string, dto: CreateExperience, order: number) {
    return buildCreateData({ resumeId, order: dto.order ?? order }, dto, {
      company: 'string',
      position: 'string',
      startDate: 'date',
      endDate: { type: 'nullableDate' },
      isCurrent: { type: 'boolean', default: false },
      location: 'optional',
      description: 'optional',
      skills: { type: 'array', default: [] },
    });
  }

  protected mapUpdate(dto: UpdateExperience) {
    return buildUpdateData(dto, {
      company: 'string',
      position: 'string',
      startDate: 'date',
      endDate: 'nullableDate',
      isCurrent: 'boolean',
      location: 'optional',
      description: 'optional',
      skills: 'array',
      order: 'number',
    });
  }
}
