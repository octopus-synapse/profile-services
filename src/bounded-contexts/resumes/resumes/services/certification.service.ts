import { Injectable, Logger } from '@nestjs/common';
import { Certification } from '@prisma/client';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import { CreateCertification, EventPublisher, UpdateCertification } from '@/shared-kernel';
import { CertificationRepository } from '../repositories/certification.repository';
import { BaseSubResourceService } from './base';

@Injectable()
export class CertificationService extends BaseSubResourceService<
  Certification,
  CreateCertification,
  UpdateCertification
> {
  protected readonly entityName = 'Certification';
  protected readonly sectionType: SectionType = 'certifications';
  protected readonly logger = new Logger(CertificationService.name);

  constructor(
    certificationRepository: CertificationRepository,
    resumesRepository: ResumesRepository,
    eventPublisher: EventPublisher,
  ) {
    super(certificationRepository, resumesRepository, eventPublisher);
  }
}
