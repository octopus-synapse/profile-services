import { PaginatedResult } from '../dto/pagination.dto';

/**
 * Generic interface for sub-resource repositories
 * All resume sub-resource repositories (Experience, Education, etc.)
 * must implement this interface to work with BaseSubResourceService
 *
 * @template T - The entity type (e.g., Experience, Education)
 * @template CreateDto - DTO for creating the entity
 * @template UpdateDto - DTO for updating the entity
 */
export interface ISubResourceRepository<T, CreateDto, UpdateDto> {
  /**
   * Find all entities for a resume with pagination
   */
  findAll(
    resumeId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<T>>;

  /**
   * Find a single entity by ID within a resume
   */
  findOne(id: string, resumeId: string): Promise<T | null>;

  /**
   * Create a new entity for a resume
   */
  create(resumeId: string, data: CreateDto): Promise<T>;

  /**
   * Update an existing entity
   */
  update(id: string, resumeId: string, data: UpdateDto): Promise<T | null>;

  /**
   * Delete an entity
   */
  delete(id: string, resumeId: string): Promise<boolean>;

  /**
   * Reorder entities within a resume
   */
  reorder(resumeId: string, ids: string[]): Promise<void>;
}
