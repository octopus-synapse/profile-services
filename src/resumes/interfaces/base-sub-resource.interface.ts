import type { PaginatedResult } from '@octopus-synapse/profile-contracts';

/**
 * Generic interface for sub-resource repositories
 * All resume sub-resource repositories (Experience, Education, etc.)
 * must implement this interface to work with BaseSubResourceService
 *
 * @template T - The entity type (e.g., Experience, Education)
 * @template Create - DTO for creating the entity
 * @template Update - DTO for updating the entity
 */
export interface ISubResourceRepository<T, Create, Update> {
  /**
   * Find all entities for a resume with pagination
   */
  findAllEntitiesForResume(
    resumeId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<T>>;

  /**
   * Find a single entity by ID within a resume
   */
  findEntityByIdAndResumeId(
    entityId: string,
    resumeId: string,
  ): Promise<T | null>;

  /**
   * Create a new entity for a resume
   */
  createEntityForResume(resumeId: string, entityData: Create): Promise<T>;

  /**
   * Update an existing entity
   */
  updateEntityForResume(
    entityId: string,
    resumeId: string,
    updateData: Update,
  ): Promise<T | null>;

  /**
   * Delete an entity
   */
  deleteEntityForResume(entityId: string, resumeId: string): Promise<boolean>;

  /**
   * Reorder entities within a resume
   */
  reorderEntitiesForResume(
    resumeId: string,
    entityIds: string[],
  ): Promise<void>;
}
