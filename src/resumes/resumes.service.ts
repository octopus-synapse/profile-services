import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ResumesRepository } from './resumes.repository';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { ApiResponseHelper } from '../common/dto/api-response.dto';

/** Maximum number of resumes a user can create */
const MAX_RESUMES_PER_USER = 4;

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(private readonly resumesRepository: ResumesRepository) {}

  async findAll(userId: string) {
    this.logger.log(`Finding all resumes for user: ${userId}`);
    return await this.resumesRepository.findAll(userId);
  }

  async findOne(id: string, userId: string) {
    this.logger.log(`Finding resume: ${id} for user: ${userId}`);
    const resume = await this.resumesRepository.findOne(id, userId);

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }

  async create(userId: string, createResumeDto: CreateResumeDto) {
    this.logger.log(`Creating resume for user: ${userId}`);

    // Check resume limit
    const existingResumes = await this.resumesRepository.findAll(userId);
    if (existingResumes.length >= MAX_RESUMES_PER_USER) {
      throw new BadRequestException(
        `You can only create up to ${MAX_RESUMES_PER_USER} resumes. Please delete an existing resume to create a new one.`,
      );
    }

    return await this.resumesRepository.create(userId, createResumeDto);
  }

  async update(id: string, userId: string, updateResumeDto: UpdateResumeDto) {
    this.logger.log(`Updating resume: ${id} for user: ${userId}`);
    const resume = await this.resumesRepository.update(
      id,
      userId,
      updateResumeDto,
    );

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }

  async remove(id: string, userId: string) {
    this.logger.log(`Removing resume: ${id} for user: ${userId}`);
    const deleted = await this.resumesRepository.delete(id, userId);

    if (!deleted) {
      throw new NotFoundException('Resume not found');
    }

    return ApiResponseHelper.message('Resume deleted successfully');
  }

  async findByUserId(userId: string) {
    this.logger.log(`Finding resume by user ID: ${userId}`);
    return await this.resumesRepository.findByUserId(userId);
  }

  /**
   * Get the number of remaining resume slots for a user
   */
  async getRemainingSlots(
    userId: string,
  ): Promise<{ used: number; limit: number; remaining: number }> {
    const existingResumes = await this.resumesRepository.findAll(userId);
    const used = existingResumes.length;
    return {
      used,
      limit: MAX_RESUMES_PER_USER,
      remaining: MAX_RESUMES_PER_USER - used,
    };
  }
}
