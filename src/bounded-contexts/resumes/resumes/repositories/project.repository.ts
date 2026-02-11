import { Injectable, Logger } from '@nestjs/common';
import { Project } from '@prisma/client';
import type { CreateProject, UpdateProject } from '@/shared-kernel';
import { BaseSubResourceRepository, buildCreateData, buildUpdateData, OrderByConfig } from './base';

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
  CreateProject,
  UpdateProject
> {
  protected readonly logger = new Logger(ProjectRepository.name);

  protected getPrismaDelegate() {
    return this.prisma.project;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'user-defined' };
  }

  protected mapCreate(resumeId: string, dto: CreateProject, order: number) {
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

  protected mapUpdate(dto: UpdateProject) {
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
