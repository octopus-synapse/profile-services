import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { HackathonRepository } from '../repositories/hackathon.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateHackathonDto, UpdateHackathonDto } from '../dto/hackathon.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Hackathon } from '@prisma/client';
import {
  ApiResponseHelper,
  MessageResponse,
} from '../../common/dto/api-response.dto';

@Injectable()
export class HackathonService {
  private readonly logger = new Logger(HackathonService.name);

  constructor(
    private readonly hackathonRepository: HackathonRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Hackathon>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.hackathonRepository.findAll(resumeId, page, limit);
  }

  async findOne(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<Hackathon> {
    await this.validateResumeOwnership(resumeId, userId);

    const hackathon = await this.hackathonRepository.findOne(id, resumeId);
    if (!hackathon) {
      throw new NotFoundException('Hackathon not found');
    }

    return hackathon;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateHackathonDto,
  ): Promise<Hackathon> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating hackathon for resume: ${resumeId}`);
    return this.hackathonRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateHackathonDto,
  ): Promise<Hackathon> {
    await this.validateResumeOwnership(resumeId, userId);

    const hackathon = await this.hackathonRepository.update(id, resumeId, data);
    if (!hackathon) {
      throw new NotFoundException('Hackathon not found');
    }

    this.logger.log(`Updated hackathon: ${id}`);
    return hackathon;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.hackathonRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Hackathon not found');
    }

    this.logger.log(`Deleted hackathon: ${id}`);
    return ApiResponseHelper.message('Hackathon deleted successfully');
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.hackathonRepository.reorder(resumeId, ids);
    return ApiResponseHelper.message('Hackathons reordered successfully');
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
