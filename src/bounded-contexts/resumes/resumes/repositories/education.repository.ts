import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { Education } from '@prisma/client';
import type { CreateEducation, UpdateEducation } from '@/shared-kernel';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Education entities
 *
 * Ordering strategy: Date-based (startDate DESC, most recent first)
 * Rationale: Education entries are naturally chronological - most recent degrees
 * should appear first. Unlike experiences, education ordering is date-driven
 * rather than user-defined. Note: order field exists for future manual reordering
 * capability but is not currently used in findAll queries.
 */
@Injectable()
export class EducationRepository extends BaseSubResourceRepository<
  Education,
  CreateEducation,
  UpdateEducation
> {
  protected readonly logger = new Logger(EducationRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.education;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'date-desc', field: 'startDate' };
  }

  protected mapCreate(resumeId: string, dto: CreateEducation, order: number) {
    return buildCreateData({ resumeId, order: dto.order ?? order }, dto, {
      institution: 'string',
      degree: 'string',
      field: 'string',
      startDate: 'date',
      endDate: { type: 'nullableDate' },
      isCurrent: { type: 'boolean', default: false },
      location: 'optional',
      description: 'optional',
      gpa: 'optional',
    });
  }

  protected mapUpdate(dto: UpdateEducation) {
    return buildUpdateData(dto, {
      institution: 'string',
      degree: 'string',
      field: 'string',
      startDate: 'date',
      endDate: 'nullableDate',
      isCurrent: 'boolean',
      location: 'optional',
      description: 'optional',
      gpa: 'optional',
      order: 'number',
    });
  }
}
