import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TalkRepository } from '../repositories/talk.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateTalkDto, UpdateTalkDto } from '../dto/talk.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Talk } from '@prisma/client';

@Injectable()
export class TalkService {
  private readonly logger = new Logger(TalkService.name);

  constructor(
    private readonly talkRepository: TalkRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Talk>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.talkRepository.findAll(resumeId, page, limit);
  }

  async findOne(resumeId: string, id: string, userId: string): Promise<Talk> {
    await this.validateResumeOwnership(resumeId, userId);

    const talk = await this.talkRepository.findOne(id, resumeId);
    if (!talk) {
      throw new NotFoundException('Talk not found');
    }

    return talk;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateTalkDto,
  ): Promise<Talk> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating talk for resume: ${resumeId}`);
    return this.talkRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateTalkDto,
  ): Promise<Talk> {
    await this.validateResumeOwnership(resumeId, userId);

    const talk = await this.talkRepository.update(id, resumeId, data);
    if (!talk) {
      throw new NotFoundException('Talk not found');
    }

    this.logger.log(`Updated talk: ${id}`);
    return talk;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.talkRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Talk not found');
    }

    this.logger.log(`Deleted talk: ${id}`);
    return { success: true, message: 'Talk deleted successfully' };
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<{ success: boolean; message: string }> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.talkRepository.reorder(resumeId, ids);
    return { success: true, message: 'Talks reordered successfully' };
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
