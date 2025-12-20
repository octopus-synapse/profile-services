import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ProjectRepository } from '../repositories/project.repository';
import { ResumesRepository } from '../resumes.repository';
import { CreateProjectDto, UpdateProjectDto } from '../dto/project.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { Project } from '@prisma/client';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly resumesRepository: ResumesRepository,
  ) {}

  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Project>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.projectRepository.findAll(resumeId, page, limit);
  }

  async findOne(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<Project> {
    await this.validateResumeOwnership(resumeId, userId);

    const project = await this.projectRepository.findOne(id, resumeId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async create(
    resumeId: string,
    userId: string,
    data: CreateProjectDto,
  ): Promise<Project> {
    await this.validateResumeOwnership(resumeId, userId);

    this.logger.log(`Creating project for resume: ${resumeId}`);
    return this.projectRepository.create(resumeId, data);
  }

  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateProjectDto,
  ): Promise<Project> {
    await this.validateResumeOwnership(resumeId, userId);

    const project = await this.projectRepository.update(id, resumeId, data);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    this.logger.log(`Updated project: ${id}`);
    return project;
  }

  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.validateResumeOwnership(resumeId, userId);

    const deleted = await this.projectRepository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException('Project not found');
    }

    this.logger.log(`Deleted project: ${id}`);
    return { success: true, message: 'Project deleted successfully' };
  }

  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<{ success: boolean; message: string }> {
    await this.validateResumeOwnership(resumeId, userId);

    await this.projectRepository.reorder(resumeId, ids);
    return { success: true, message: 'Projects reordered successfully' };
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
