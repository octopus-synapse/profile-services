import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CertificationService } from '../services/certification.service';
import {
  CreateCertificationDto,
  UpdateCertificationDto,
  CertificationResponseDto,
} from '../dto/certification.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Certification } from '@prisma/client';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/certifications')
@UseGuards(JwtAuthGuard)
export class CertificationController extends BaseSubResourceController<
  Certification,
  CreateCertificationDto,
  UpdateCertificationDto,
  CertificationResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Certification,
    CreateCertificationDto,
    UpdateCertificationDto,
    CertificationResponseDto
  > = {
    entityName: 'certification',
    entityPluralName: 'certifications',
    responseDtoClass: CertificationResponseDto,
    createDtoClass: CreateCertificationDto,
    updateDtoClass: UpdateCertificationDto,
  };

  constructor(certificationService: CertificationService) {
    super(certificationService);
  }
}
