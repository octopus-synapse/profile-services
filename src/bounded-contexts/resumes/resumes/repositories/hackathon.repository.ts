import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { Hackathon } from '@prisma/client';
import type { CreateHackathon, UpdateHackathon } from '@/shared-kernel';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Hackathon entities
 *
 * Ordering strategy: Date-based (date DESC, most recent first)
 * Rationale: Hackathons are chronological events - most recent should appear first.
 */
@Injectable()
export class HackathonRepository extends BaseSubResourceRepository<
  Hackathon,
  CreateHackathon,
  UpdateHackathon
> {
  protected readonly logger = new Logger(HackathonRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.hackathon;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'date-desc', field: 'date' };
  }

  protected mapCreate(resumeId: string, dto: CreateHackathon, order: number) {
    return buildCreateData({ resumeId, order: order }, dto, {
      name: 'string',
      organizer: 'string',
      position: 'optional',
      projectName: 'string',
      description: 'optional',
      technologies: { type: 'array', default: [] },
      teamSize: 'number',
      demoUrl: 'optional',
      repoUrl: 'optional',
      date: 'date',
      prize: 'optional',
    });
  }

  protected mapUpdate(dto: UpdateHackathon) {
    return buildUpdateData(dto, {
      name: 'string',
      organizer: 'string',
      position: 'optional',
      projectName: 'string',
      description: 'optional',
      technologies: 'array',
      teamSize: 'number',
      demoUrl: 'optional',
      repoUrl: 'optional',
      date: 'date',
      prize: 'optional',
      order: 'number',
    });
  }
}
