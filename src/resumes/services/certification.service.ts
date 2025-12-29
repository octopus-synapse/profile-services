import { Injectable, Logger } from '@nestjs/common';
import { Certification } from '@prisma/client';
import { CertificationRepository } from '../repositories/certification.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateCertificationDto,
  UpdateCertificationDto,
} from '../dto/certification.dto';
import { BaseSubResourceService } from './base';

@Injectable()
export class CertificationService extends BaseSubResourceService<
  Certification,
  CreateCertificationDto,
  UpdateCertificationDto
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
