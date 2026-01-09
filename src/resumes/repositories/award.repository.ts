import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Award } from '@prisma/client';
import { CreateAwardDto, UpdateAwardDto } from '../dto/award.dto';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Award entities
 *
 * Ordering strategy: Date-based (date DESC, most recent first)
 * Rationale: Awards are chronological achievements - most recent should appear first.
 */
@Injectable()
export class AwardRepository extends BaseSubResourceRepository<
  Award,
  CreateAwardDto,
  UpdateAwardDto
> {
  protected readonly logger = new Logger(AwardRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.award;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'date-desc', field: 'date' };
  }

  protected mapCreateDto(resumeId: string, dto: CreateAwardDto, order: number) {
    return buildCreateData({ resumeId, order: dto.order ?? order }, dto, {
      title: 'string',
      issuer: 'string',
      date: 'date',
      description: 'optional',
    });
  }

  protected mapUpdateDto(dto: UpdateAwardDto) {
    return buildUpdateData(dto, {
      title: 'string',
      issuer: 'string',
      date: 'date',
      description: 'optional',
      order: 'number',
    });
  }
}
