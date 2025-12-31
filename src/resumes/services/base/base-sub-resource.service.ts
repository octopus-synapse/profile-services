import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { ResumesRepository } from '../../resumes.repository';
import { ISubResourceRepository } from '../../interfaces/base-sub-resource.interface';
import { PaginatedResult } from '../../dto/pagination.dto';
import {
  ApiResponseHelper,
  DataResponse,
  MessageResponse,
} from '../../../common/dto/api-response.dto';
import { ERROR_MESSAGES } from '../../../common/constants/app.constants';

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
    protected readonly repository: ISubResourceRepository<
      T,
      CreateDto,
      UpdateDto
    >,
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
      throw new ForbiddenException(ERROR_MESSAGES.RESUME_ACCESS_DENIED);
    }
  }

  /**
   * List all entities for a resume with pagination
   */
  async listForResume(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<T>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.repository.findAll(resumeId, page, limit);
  }

  /**
   * Get a single entity by its ID
   * Throws NotFoundException if not found
   */
  async getById(
    resumeId: string,
    entityId: string,
    userId: string,
  ): Promise<DataResponse<T>> {
    await this.validateResumeOwnership(resumeId, userId);
    const entity = await this.repository.findOne(entityId, resumeId);
    if (!entity) {
      throw new NotFoundException(`${this.entityName} not found`);
    }
    return ApiResponseHelper.success(entity);
  }

  /**
   * Add a new entity to the resume
   */
  async addToResume(
    resumeId: string,
    userId: string,
    entityData: CreateDto,
  ): Promise<DataResponse<T>> {
    await this.validateResumeOwnership(resumeId, userId);
    this.logger.log(`Creating ${this.entityName} for resume: ${resumeId}`);
    const entity = await this.repository.create(resumeId, entityData);
    return ApiResponseHelper.success(entity);
  }

  /**
   * Update an existing entity by its ID
   * Throws NotFoundException if not found
   */
  async updateById(
    resumeId: string,
    entityId: string,
    userId: string,
    updateData: UpdateDto,
  ): Promise<DataResponse<T>> {
    await this.validateResumeOwnership(resumeId, userId);
    const entity = await this.repository.update(entityId, resumeId, updateData);
    if (!entity) {
      throw new NotFoundException(`${this.entityName} not found`);
    }
    this.logger.log(`Updated ${this.entityName}: ${entityId}`);
    return ApiResponseHelper.success(entity);
  }

  /**
   * Delete an entity by its ID
   * Throws NotFoundException if not found
   */
  async deleteById(
    resumeId: string,
    entityId: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);
    const deleted = await this.repository.delete(entityId, resumeId);
    if (!deleted) {
      throw new NotFoundException(`${this.entityName} not found`);
    }
    this.logger.log(`Deleted ${this.entityName}: ${entityId}`);
    return ApiResponseHelper.message(`${this.entityName} deleted successfully`);
  }

  /**
   * Reorder entities within a resume
   */
  async reorderInResume(
    resumeId: string,
    userId: string,
    entityIds: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);
    await this.repository.reorder(resumeId, entityIds);
    return ApiResponseHelper.message(
      `${this.entityName}s reordered successfully`,
    );
  }
}
