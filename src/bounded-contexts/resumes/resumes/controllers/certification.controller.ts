import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { CertificationService } from '../services/certification.service';
import type {
  CreateCertification,
  UpdateCertification,
} from '@octopus-synapse/profile-contracts';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Certification } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/certifications')
@UseGuards(JwtAuthGuard)
export class CertificationController extends BaseSubResourceController<
  Certification,
  CreateCertification,
  UpdateCertification,
  Certification
> {
  protected readonly config: SubResourceControllerConfig<
    Certification,
    CreateCertification,
    UpdateCertification,
    Certification
  > = {
    entityName: 'certification',
    entityPluralName: 'certifications',
  };

  constructor(certificationService: CertificationService) {
    super(certificationService);
  }
}
