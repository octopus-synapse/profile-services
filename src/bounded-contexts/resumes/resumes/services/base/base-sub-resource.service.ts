import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import {
  ApiResponseHelper,
  DataResponse,
  MessageResponse,
} from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';
import {
  SectionAddedEvent,
  SectionRemovedEvent,
  SectionUpdatedEvent,
} from '@/bounded-contexts/resumes/domain/events';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import type { PaginatedResult } from '@/shared-kernel';
import { ERROR_MESSAGES, EventPublisher } from '@/shared-kernel';
import type { ISubResourceRepository } from '../../interfaces/base-sub-resource.interface';

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
 * Event Publishing:
 * - Emits SectionAddedEvent when a new entity is created
 * - Emits SectionUpdatedEvent when an entity is updated
 * - Emits SectionRemovedEvent when an entity is deleted
 *
 * @template T - The entity type (e.g., Experience, Education)
 * @template Create - DTO for creating the entity
 * @template Update - DTO for updating the entity
 */
export abstract class BaseSubResourceService<T, Create, Update> {
  /**
   * The name of the entity for error messages and logging
   * Must be implemented by concrete classes
   */
  protected abstract readonly entityName: string;

  /**
   * The section type for event payloads
   * Must be implemented by concrete classes
   */
  protected abstract readonly sectionType: SectionType;

  /**
   * Logger instance for the concrete service
   * Must be implemented by concrete classes
   */
  protected abstract readonly logger: Logger;

  constructor(
    protected readonly repository: ISubResourceRepository<T, Create, Update>,
    protected readonly resumesRepository: ResumesRepository,
    protected readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Validates that the user owns the resume
   * Throws ForbiddenException if the user doesn't have access
   * Logs unauthorized access attempts for security auditing
   */
  protected async validateResumeOwnership(resumeId: string, userId: string): Promise<void> {
    const resume = await this.resumesRepository.findResumeByIdAndUserId(resumeId, userId);
    if (!resume) {
      // Security: Log unauthorized access attempts for audit trail
      this.logger.warn(`Unauthorized ${this.entityName} access attempt`, {
        userId,
        resumeId,
        timestamp: new Date().toISOString(),
      });
      throw new ForbiddenException(ERROR_MESSAGES.RESUME_ACCESS_DENIED);
    }
  }

  /**
   * List all entities for a resume with pagination
   */
  async listAllEntitiesForResume(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<T>> {
    await this.validateResumeOwnership(resumeId, userId);
    return this.repository.findAllEntitiesForResume(resumeId, page, limit);
  }

  /**
   * Get a single entity by its ID
   * Throws NotFoundException if not found
   */
  async getEntityByIdForResume(
    resumeId: string,
    entityId: string,
    userId: string,
  ): Promise<DataResponse<T>> {
    await this.validateResumeOwnership(resumeId, userId);
    const foundEntity = await this.repository.findEntityByIdAndResumeId(entityId, resumeId);
    if (!foundEntity) {
      throw new NotFoundException(`${this.entityName} not found`);
    }
    return ApiResponseHelper.success(foundEntity);
  }

  /**
   * Add a new entity to the resume
   * Emits SectionAddedEvent after creation
   */
  async addEntityToResume(
    resumeId: string,
    userId: string,
    entityData: Create,
  ): Promise<DataResponse<T>> {
    await this.validateResumeOwnership(resumeId, userId);
    this.logger.log(`Creating ${this.entityName} for resume: ${resumeId}`);
    const createdEntity = await this.repository.createEntityForResume(resumeId, entityData);

    const entityId = (createdEntity as { id: string }).id;
    this.eventPublisher.publish(
      new SectionAddedEvent(resumeId, {
        userId,
        sectionType: this.sectionType,
        sectionId: entityId,
      }),
    );

    return ApiResponseHelper.success(createdEntity);
  }

  /**
   * Update an existing entity by its ID
   * Emits SectionUpdatedEvent after update
   * Throws NotFoundException if not found
   */
  async updateEntityByIdForResume(
    resumeId: string,
    entityId: string,
    userId: string,
    updateData: Update,
  ): Promise<DataResponse<T>> {
    await this.validateResumeOwnership(resumeId, userId);
    const updatedEntity = await this.repository.updateEntityForResume(
      entityId,
      resumeId,
      updateData,
    );
    if (!updatedEntity) {
      throw new NotFoundException(`${this.entityName} not found`);
    }

    this.eventPublisher.publish(
      new SectionUpdatedEvent(resumeId, {
        userId,
        sectionType: this.sectionType,
        sectionId: entityId,
        operation: 'updated',
      }),
    );

    this.logger.log(`Updated ${this.entityName}: ${entityId}`);
    return ApiResponseHelper.success(updatedEntity);
  }

  /**
   * Delete an entity by its ID
   * Emits SectionRemovedEvent after deletion
   * Throws NotFoundException if not found
   */
  async deleteEntityByIdForResume(
    resumeId: string,
    entityId: string,
    userId: string,
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);
    const wasEntityDeleted = await this.repository.deleteEntityForResume(entityId, resumeId);
    if (!wasEntityDeleted) {
      throw new NotFoundException(`${this.entityName} not found`);
    }

    this.eventPublisher.publish(
      new SectionRemovedEvent(resumeId, {
        userId,
        sectionType: this.sectionType,
        sectionId: entityId,
      }),
    );

    this.logger.log(`Deleted ${this.entityName}: ${entityId}`);
    return ApiResponseHelper.message(`${this.entityName} deleted successfully`);
  }

  /**
   * Reorder entities within a resume
   */
  async reorderEntitiesInResume(
    resumeId: string,
    userId: string,
    entityIds: string[],
  ): Promise<MessageResponse> {
    await this.validateResumeOwnership(resumeId, userId);
    await this.repository.reorderEntitiesForResume(resumeId, entityIds);
    return ApiResponseHelper.message(`${this.entityName}s reordered successfully`);
  }
}
