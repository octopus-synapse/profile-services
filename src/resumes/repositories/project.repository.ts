import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Project } from '@prisma/client';
import { CreateProjectDto, UpdateProjectDto } from '../dto/project.dto';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Project entities
 *
 * Ordering strategy: User-defined (order field, ascending)
 * Rationale: Projects should be ordered as the user prefers,
 * allowing manual reordering via drag-and-drop for optimal presentation.
 */
@Injectable()
export class ProjectRepository extends BaseSubResourceRepository<
  Project,
  CreateProjectDto,
  UpdateProjectDto
> {
  protected readonly logger = new Logger(ProjectRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.project;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'user-defined' };
  }

  protected mapCreateDto(
    resumeId: string,
    dto: CreateProjectDto,
    order: number,
  ) {
    return buildCreateData({ resumeId, order: dto.order ?? order }, dto, {
      name: 'string',
      description: 'optional',
      url: 'optional',
      startDate: { type: 'nullableDate' },
      endDate: { type: 'nullableDate' },
      isCurrent: { type: 'boolean', default: false },
      technologies: { type: 'array', default: [] },
    });
  }

  protected mapUpdateDto(dto: UpdateProjectDto) {
    return buildUpdateData(dto, {
      name: 'string',
      description: 'optional',
      url: 'optional',
      startDate: 'nullableDate',
      endDate: 'nullableDate',
      isCurrent: 'boolean',
      technologies: 'array',
      order: 'number',
    });
  }
}
