import {
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ResumesRepository } from '../../resumes.repository';
import { ISubResourceRepository } from '../../interfaces/base-sub-resource.interface';
import { PaginatedResult } from '../../dto/pagination.dto';
import {
  ApiResponseHelper,
  MessageResponse,
} from '../../../common/dto/api-response.dto';

/**
 * Abstract base service for resume sub-resources
 *
 * Implements the common CRUD operations that are shared across all
 * sub-resources (Experience, Education, Skill, etc.)
 *
 * Following Uncle Bob's principles:
 * - SRP: This class has a single responsibility - managing CRUD for sub-resources
 * - OCP: Open for extension (abstract), closed for modification
 * - DIP: Depends on ISubResourceRepository abstraction
 *
 * @template T - The entity type (e.g., Experience, Education)
 * @template CreateDto - DTO for creating the entity
 * @template UpdateDto - DTO for updating the entity
 */
export abstract class BaseSubResourceService<T, CreateDto, UpdateDto> {
  /**
   * The name of the entity for error messages and logging
   * Must be implemented by concrete classes
   */
  protected abstract readonly entityName: string;

  /**
   * Logger instance for the concrete service
   * Must be implemented by concrete classes
   */
  protected abstract readonly logger: Logger;

  constructor(
    protected readonly repository: ISubResourceRepository<T, CreateDto, UpdateDto>,
    protected readonly resumesRepository: ResumesRepository,
  ) {}

  /**
   * Validates that the user owns the resume
   * Throws ForbiddenException if the user doesn't have access
   */
  protected async validateResumeOwnership(
    resumeId: string,
    userId: string,
  ): Promise<void> {
    const resume = await this.resumesRepository.findOne(resumeId, userId);
    if (!resume) {
      throw new ForbiddenException('Resume not found or access denied');
    }
  }

  /**
   * Find all entities for a resume with pagination
   */
  async findAll(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<T>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.repository.findAll(resumeId, page, limit);
  }

  /**
   * Find a single entity by ID
   * Throws NotFoundException if not found
   */
  async findOne(resumeId: string, id: string, userId: string): Promise<T> {
    await this.validateResumeOwnership(resumeId, userId);
    const entity = await this.repository.findOne(id, resumeId);
    if (!entity) {
      throw new NotFoundException(`${this.entityName} not found`);
    }
    return entity;
  }

  /**
   * Create a new entity
   */
  async create(
    resumeId: string,
    userId: string,
    data: CreateDto,
  ): Promise<T> {
    await this.validateResumeOwnership(resumeId, userId);
    this.logger.log(`Creating ${this.entityName} for resume: ${resumeId}`);
    return this.repository.create(resumeId, data);
  }

  /**
   * Update an existing entity
   * Throws NotFoundException if not found
   */
  async update(
    resumeId: string,
    id: string,
    userId: string,
    data: UpdateDto,
  ): Promise<T> {
    await this.validateResumeOwnership(resumeId, userId);
    const entity = await this.repository.update(id, resumeId, data);
    if (!entity) {
      throw new NotFoundException(`${this.entityName} not found`);
    }
    this.logger.log(`Updated ${this.entityName}: ${id}`);
    return entity;
  }

  /**
   * Remove an entity
   * Throws NotFoundException if not found
   */
  async remove(
    resumeId: string,
    id: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);
    const deleted = await this.repository.delete(id, resumeId);
    if (!deleted) {
      throw new NotFoundException(`${this.entityName} not found`);
    }
    this.logger.log(`Deleted ${this.entityName}: ${id}`);
    return ApiResponseHelper.message(`${this.entityName} deleted successfully`);
  }

  /**
   * Reorder entities within a resume
   */
  async reorder(
    resumeId: string,
    userId: string,
    ids: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);
    await this.repository.reorder(resumeId, ids);
    return ApiResponseHelper.message(
      `${this.entityName}s reordered successfully`,
    );
  }
}
