import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { CertificationService } from '../services/certification.service';
import type { CreateCertification, UpdateCertification } from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Certification } from '@prisma/client';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
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
