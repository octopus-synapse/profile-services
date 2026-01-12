import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ISubResourceRepository } from '../../interfaces/base-sub-resource.interface';
import type { PaginatedResult } from '@octopus-synapse/profile-contracts';
import { PAGINATION } from '@octopus-synapse/profile-contracts';

/**
 * Prisma delegate type - represents any Prisma model delegate
 * We use a flexible signature because Prisma delegates have complex, generated types
 * that vary per model. Type safety is maintained through the generic T parameter.
 */
type PrismaDelegate<T> = {
  findFirst: (args?: unknown) => Promise<T | null>;
  findMany: (args?: unknown) => Promise<T[]>;
  findUnique: (args?: unknown) => Promise<T | null>;
  count: (args?: unknown) => Promise<number>;
  create: (args: unknown) => Promise<T>;
  update: (args: unknown) => Promise<T>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
  deleteMany: (args: unknown) => Promise<{ count: number }>;
  aggregate: (args: unknown) => Promise<unknown>;
};

/**
 * Ordering configuration for findAll queries
 */
export type OrderByConfig =
  | { type: 'user-defined' }
  | { type: 'date-desc'; field: string }
  | {
      type: 'multiple';
      fields: Array<{ field: string; direction: 'asc' | 'desc' }>;
    };

/**
 * Additional filter configuration for findAll queries
 */
export type FindAllFilters = Record<string, unknown>;

/**
 * Abstract base repository for resume sub-resources
 *
 * Implements 70% of shared CRUD logic across 15 repositories:
 * - findOne() - 100% reusable
 * - reorder() - 100% reusable
 * - getMaxOrder() - 95% reusable (supports optional category scoping)
 * - findAll() - 85% reusable (configurable ordering + filters)
 * - delete() - 85% reusable (standardized on deleteMany)
 * - update() - 70% reusable (base logic + entity-specific mapping)
 *
 * Concrete repositories must implement:
 * - getPrismaDelegate() - Returns the specific Prisma delegate (e.g., prisma.experience)
 * - getOrderByConfig() - Defines ordering strategy for findAll()
 * - mapCreate() - Maps Create to Prisma create data
 * - mapUpdate() - Maps Update to Prisma update data
 *
 * @template T - Entity type (e.g., Experience, Education)
 * @template Create - DTO for creating the entity
 * @template Update - DTO for updating the entity
 */
export abstract class BaseSubResourceRepository<T, Create, Update>
  implements ISubResourceRepository<T, Create, Update>
{
  /**
   * Logger instance - concrete classes must override with their own name
   */
  protected abstract readonly logger: Logger;

  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Returns the Prisma delegate for this entity type
   * Must be implemented by concrete classes
   *
   * @example
   * protected getPrismaDelegate() {
   *   return this.prisma.experience;
   * }
   */
  protected abstract getPrismaDelegate(): PrismaDelegate<T>;

  /**
   * Returns the ordering configuration for findAll queries
   * Must be implemented by concrete classes
   *
   * @example
   * // User-defined ordering
   * protected getOrderByConfig(): OrderByConfig {
   *   return { type: 'user-defined' };
   * }
   *
   * @example
   * // Date-based ordering
   * protected getOrderByConfig(): OrderByConfig {
   *   return { type: 'date-desc', field: 'startDate' };
   * }
   *
   * @example
   * // Multiple field ordering (for Skill repository)
   * protected getOrderByConfig(): OrderByConfig {
   *   return {
   *     type: 'multiple',
   *     fields: [
   *       { field: 'category', direction: 'asc' },
   *       { field: 'order', direction: 'asc' }
   *     ]
   *   };
   * }
   */
  protected abstract getOrderByConfig(): OrderByConfig;

  /**
   * Maps Create to Prisma create data object
   * Must be implemented by concrete classes
   *
   * @example
   * protected mapCreate(resumeId: string, dto: CreateExperience, order: number) {
   *   return {
   *     resumeId,
   *     company: dto.company,
   *     position: dto.position,
   *     startDate: new Date(dto.startDate),
   *     endDate: dto.endDate ? new Date(dto.endDate) : null,
   *     isCurrent: dto.isCurrent ?? false,
   *     location: dto.location,
   *     description: dto.description,
   *     skills: dto.skills ?? [],
   *     order: dto.order ?? order,
   *   };
   * }
   */
  protected abstract mapCreate(
    resumeId: string,
    dto: Create,
    order: number,
  ): Record<string, unknown>;

  /**
   * Maps Update to Prisma update data object
   * Must be implemented by concrete classes
   *
   * @example
   * protected mapUpdate(dto: UpdateExperience) {
   *   return {
   *     ...(dto.company && { company: dto.company }),
   *     ...(dto.position && { position: dto.position }),
   *     ...(dto.startDate && { startDate: new Date(dto.startDate) }),
   *     ...(dto.endDate !== undefined && {
   *       endDate: dto.endDate ? new Date(dto.endDate) : null,
   *     }),
   *     ...(dto.isCurrent !== undefined && { isCurrent: dto.isCurrent }),
   *     ...(dto.location !== undefined && { location: dto.location }),
   *     ...(dto.description !== undefined && { description: dto.description }),
   *     ...(dto.skills && { skills: dto.skills }),
   *     ...(dto.order !== undefined && { order: dto.order }),
   *   };
   * }
   */
  protected abstract mapUpdate(dto: Update): Record<string, unknown>;

  /**
   * Optional: Allows concrete classes to add additional filters to findAll
   * Default implementation returns empty filters
   * Override in concrete classes like SkillRepository to add category filtering
   */
  protected getFindAllFilters(): FindAllFilters {
    return {};
  }

  /**
   * Optional: Returns additional where clause fields for getMaxOrder
   * Default implementation returns empty object
   * Override in SkillRepository to scope by category
   */
  protected getMaxOrderScope(_dto?: Create): Record<string, unknown> {
    return {};
  }

  // =============================================================================
  // FULLY IMPLEMENTED METHODS (100% reusable)
  // =============================================================================

  /**
   * Find a single entity by ID within a resume
   * 100% identical across all 15 repositories
   */
  async findOne(id: string, resumeId: string): Promise<T | null> {
    const delegate = this.getPrismaDelegate();
    return delegate.findFirst({
      where: { id, resumeId },
    });
  }

  /**
   * Reorder entities within a resume
   * 100% identical across 13 repositories (2 don't support reordering)
   */
  async reorder(resumeId: string, ids: string[]): Promise<void> {
    const delegate = this.getPrismaDelegate();
    await this.prisma.$transaction(async () => {
      for (let index = 0; index < ids.length; index++) {
        await delegate.update({
          where: { id: ids[index] },
          data: { order: index },
        });
      }
    });
  }

  /**
   * Get maximum order value for a resume
   * 95% identical - supports optional scoping (e.g., by category for Skills)
   */
  protected async getMaxOrder(resumeId: string, dto?: Create): Promise<number> {
    const delegate = this.getPrismaDelegate();
    const additionalScope = this.getMaxOrderScope(dto);

    const result = (await delegate.aggregate({
      where: { resumeId, ...additionalScope },
      _max: { order: true },
    })) as { _max: { order: number | null } };

    return result._max.order ?? -1;
  }

  // =============================================================================
  // CONFIGURABLE METHODS (85-90% reusable)
  // =============================================================================

  /**
   * Find all entities for a resume with pagination
   * 85% reusable - ordering strategy configured by concrete class
   */
  async findAll(
    resumeId: string,
    page: number = PAGINATION.DEFAULT_PAGE,
    limit: number = PAGINATION.DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedResult<T>> {
    const skip = (page - 1) * limit;
    const delegate = this.getPrismaDelegate();
    const orderByConfig = this.getOrderByConfig();
    const additionalFilters = this.getFindAllFilters();

    // Build orderBy clause based on configuration
    let orderBy:
      | Record<string, string>
      | Array<Record<string, string>>
      | undefined;

    switch (orderByConfig.type) {
      case 'user-defined':
        orderBy = { order: 'asc' };
        break;
      case 'date-desc':
        orderBy = { [orderByConfig.field]: 'desc' };
        break;
      case 'multiple':
        orderBy = orderByConfig.fields.map((f) => ({
          [f.field]: f.direction,
        }));
        break;
    }

    const where = { resumeId, ...additionalFilters };

    const [data, total] = await Promise.all([
      delegate.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      delegate.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Delete an entity by ID
   * 85% reusable - standardized on deleteMany approach (best practice)
   */
  async delete(id: string, resumeId: string): Promise<boolean> {
    const delegate = this.getPrismaDelegate();
    const result = await delegate.deleteMany({
      where: { id, resumeId },
    });
    return result.count > 0;
  }

  /**
   * Update an entity by ID
   * 70% reusable - uses standardized updateMany approach + entity-specific mapping
   */
  async update(id: string, resumeId: string, data: Update): Promise<T | null> {
    const delegate = this.getPrismaDelegate();
    const updateData = this.mapUpdate(data);

    const result = await delegate.updateMany({
      where: { id, resumeId },
      data: updateData,
    });

    if (result.count === 0) return null;

    return delegate.findUnique({ where: { id } });
  }

  /**
   * Create a new entity for a resume
   * 70% reusable - structure identical, field mapping entity-specific
   */
  async create(resumeId: string, data: Create): Promise<T> {
    const maxOrder = await this.getMaxOrder(resumeId, data);
    const delegate = this.getPrismaDelegate();
    const createData = this.mapCreate(resumeId, data, maxOrder + 1);

    return delegate.create({ data: createData });
  }
}
