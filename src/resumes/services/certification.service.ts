import { Injectable, Logger } from '@nestjs/common';
import { Certification } from '@prisma/client';
import { CertificationRepository } from '../repositories/certification.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateCertification,
  UpdateCertification,
} from '@octopus-synapse/profile-contracts';
import { BaseSubResourceService } from './base';

@Injectable()
export class CertificationService extends BaseSubResourceService<
  Certification,
  CreateCertification,
  UpdateCertification
> {
  protected readonly entityName = 'Certification';
  protected readonly logger = new Logger(CertificationService.name);

  constructor(
    certificationRepository: CertificationRepository,
    resumesRepository: ResumesRepository,
  ) {
    super(certificationRepository, resumesRepository);
  }
}
