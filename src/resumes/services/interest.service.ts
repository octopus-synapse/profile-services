import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InterestRepository } from '../repositories/interest.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateInterestDto, UpdateInterestDto } from '../dto/interest.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Interest } from '@prisma/client';

@Injectable()
export class InterestService {
  private readonly logger = new Logger(InterestService.name);

  constructor(
    private readonly interestRepository: InterestRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Interest>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.interestRepository.findAll(resumeId, page, limit);
  }

  async findOne(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<Interest> {
    await this.validateResumeOwnership(resumeId, userId);

    const interest = await this.interestRepository.findOne(id, resumeId);
    if (!interest) {
      throw new NotFoundException('Interest not found');
    }

    return interest;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateInterestDto,
  ): Promise<Interest> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating interest for resume: ${resumeId}`);
    return this.interestRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateInterestDto,
  ): Promise<Interest> {
    await this.validateResumeOwnership(resumeId, userId);

    const interest = await this.interestRepository.update(id, resumeId, data);
    if (!interest) {
      throw new NotFoundException('Interest not found');
    }

    this.logger.log(`Updated interest: ${id}`);
    return interest;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.interestRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Interest not found');
    }

    this.logger.log(`Deleted interest: ${id}`);
    return { success: true, message: 'Interest deleted successfully' };
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<{ success: boolean; message: string }> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.interestRepository.reorder(resumeId, ids);
    return { success: true, message: 'Interests reordered successfully' };
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
