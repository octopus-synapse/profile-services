import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Experience } from '@prisma/client';
import {
  CreateExperienceDto,
  UpdateExperienceDto,
} from '../dto/experience.dto';
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
  CreateExperienceDto,
  UpdateExperienceDto
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

  protected mapCreateDto(
    resumeId: string,
    dto: CreateExperienceDto,
    order: number,
  ) {
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

  protected mapUpdateDto(dto: UpdateExperienceDto) {
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
