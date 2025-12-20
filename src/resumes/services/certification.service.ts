import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CertificationRepository } from '../repositories/certification.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreateCertificationDto,
  UpdateCertificationDto,
} from '../dto/certification.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Certification } from '@prisma/client';

@Injectable()
export class CertificationService {
  private readonly logger = new Logger(CertificationService.name);

  constructor(
    private readonly certificationRepository: CertificationRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Certification>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.certificationRepository.findAll(resumeId, page, limit);
  }

  async findOne(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<Certification> {
    await this.validateResumeOwnership(resumeId, userId);

    const certification = await this.certificationRepository.findOne(
      id,
      resumeId,
    );
    if (!certification) {
      throw new NotFoundException('Certification not found');
    }

    return certification;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateCertificationDto,
  ): Promise<Certification> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating certification for resume: ${resumeId}`);
    return this.certificationRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateCertificationDto,
  ): Promise<Certification> {
    await this.validateResumeOwnership(resumeId, userId);

    const certification = await this.certificationRepository.update(
      id,
      resumeId,
      data,
    );
    if (!certification) {
      throw new NotFoundException('Certification not found');
    }

    this.logger.log(`Updated certification: ${id}`);
    return certification;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.certificationRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Certification not found');
    }

    this.logger.log(`Deleted certification: ${id}`);
    return { success: true, message: 'Certification deleted successfully' };
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<{ success: boolean; message: string }> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.certificationRepository.reorder(resumeId, ids);
    return { success: true, message: 'Certifications reordered successfully' };
  }

  private async validateResumeOwnership(
    resumeId: string,
    userId: string,
  ): Promise<void> {
    const resume = await this.resumesRepository.findOne(resumeId, userId);
    if (!resume) {
      throw new ForbiddenException('Resume not found or access denied');
    }
  }
}
