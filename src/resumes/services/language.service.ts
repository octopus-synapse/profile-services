import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { LanguageRepository } from '../repositories/language.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateLanguageDto, UpdateLanguageDto } from '../dto/language.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Language } from '@prisma/client';
import {
  ApiResponseHelper,
  MessageResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class LanguageService {
  private readonly logger = new Logger(LanguageService.name);

  constructor(
    private readonly languageRepository: LanguageRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Language>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.languageRepository.findAll(resumeId, page, limit);
  }

  async findOne(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<Language> {
    await this.validateResumeOwnership(resumeId, userId);

    const language = await this.languageRepository.findOne(id, resumeId);
    if (!language) {
      throw new NotFoundException('Language not found');
    }

    return language;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateLanguageDto,
  ): Promise<Language> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating language for resume: ${resumeId}`);
    return this.languageRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateLanguageDto,
  ): Promise<Language> {
    await this.validateResumeOwnership(resumeId, userId);

    const language = await this.languageRepository.update(id, resumeId, data);
    if (!language) {
      throw new NotFoundException('Language not found');
    }

    this.logger.log(`Updated language: ${id}`);
    return language;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.languageRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Language not found');
    }

    this.logger.log(`Deleted language: ${id}`);
    return ApiResponseHelper.message('Language deleted successfully');
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.languageRepository.reorder(resumeId, ids);
    return ApiResponseHelper.message('Languages reordered successfully');
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
