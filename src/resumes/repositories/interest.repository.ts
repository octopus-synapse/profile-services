import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Interest } from '@prisma/client';
import { CreateInterestDto, UpdateInterestDto } from '../dto/interest.dto';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Interest entities
 *
 * Ordering strategy: User-defined (order field, ascending)
 * Rationale: Interests have no natural chronological order - user control is most appropriate.
 */
@Injectable()
export class InterestRepository extends BaseSubResourceRepository<
  Interest,
  CreateInterestDto,
  UpdateInterestDto
> {
  protected readonly logger = new Logger(InterestRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.interest;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'user-defined' };
  }

  protected mapCreateDto(
    resumeId: string,
    dto: CreateInterestDto,
    order: number,
  ) {
    return buildCreateData({ resumeId, order: dto.order ?? order }, dto, {
      name: 'string',
    });
  }

  protected mapUpdateDto(dto: UpdateInterestDto) {
    return buildUpdateData(dto, {
      name: 'string',
      order: 'number',
    });
  }
}
