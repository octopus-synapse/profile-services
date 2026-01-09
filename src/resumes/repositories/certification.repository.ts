import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Certification } from '@prisma/client';
import {
  CreateCertificationDto,
  UpdateCertificationDto,
} from '../dto/certification.dto';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Certification entities
 *
 * Ordering strategy: Date-based (issueDate DESC, most recent first)
 * Rationale: Certifications are naturally chronological - most recent certs
 * should appear first to showcase current qualifications.
 */
@Injectable()
export class CertificationRepository extends BaseSubResourceRepository<
  Certification,
  CreateCertificationDto,
  UpdateCertificationDto
> {
  protected readonly logger = new Logger(CertificationRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.certification;
  }

  protected getOrderByConfig(): OrderByConfig {
    return { type: 'date-desc', field: 'issueDate' };
  }

  protected mapCreateDto(
    resumeId: string,
    dto: CreateCertificationDto,
    order: number,
  ) {
    return buildCreateData({ resumeId, order: dto.order ?? order }, dto, {
      name: 'string',
      issuer: 'string',
      issueDate: 'date',
      expiryDate: { type: 'nullableDate' },
      credentialId: 'optional',
      credentialUrl: 'optional',
    });
  }

  protected mapUpdateDto(dto: UpdateCertificationDto) {
    return buildUpdateData(dto, {
      name: 'string',
      issuer: 'string',
      issueDate: 'date',
      expiryDate: 'nullableDate',
      credentialId: 'optional',
      credentialUrl: 'optional',
      order: 'number',
    });
  }
}
