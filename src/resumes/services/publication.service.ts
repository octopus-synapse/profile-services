import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PublicationRepository } from '../repositories/publication.repository';
import { ResumesRepository } from '../resumes.repository';
import {
  CreatePublicationDto,
  UpdatePublicationDto,
} from '../dto/publication.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Publication } from '@prisma/client';
import {
  ApiResponseHelper,
  MessageResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class PublicationService {
  private readonly logger = new Logger(PublicationService.name);

  constructor(
    private readonly publicationRepository: PublicationRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Publication>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.publicationRepository.findAll(resumeId, page, limit);
  }

  async findOne(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<Publication> {
    await this.validateResumeOwnership(resumeId, userId);

    const publication = await this.publicationRepository.findOne(id, resumeId);
    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    return publication;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreatePublicationDto,
  ): Promise<Publication> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating publication for resume: ${resumeId}`);
    return this.publicationRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdatePublicationDto,
  ): Promise<Publication> {
    await this.validateResumeOwnership(resumeId, userId);

    const publication = await this.publicationRepository.update(
      id,
      resumeId,
      data,
    );
    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    this.logger.log(`Updated publication: ${id}`);
    return publication;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.publicationRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Publication not found');
    }

    this.logger.log(`Deleted publication: ${id}`);
    return ApiResponseHelper.message('Publication deleted successfully');
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.publicationRepository.reorder(resumeId, ids);
    return ApiResponseHelper.message('Publications reordered successfully');
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
