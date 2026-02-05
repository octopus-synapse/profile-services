import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { Skill } from '@prisma/client';
import type { CreateSkill, UpdateSkill } from '@/shared-kernel';
import type { PaginatedResult } from '@/shared-kernel';
import { PAGINATION, SkillLevelToNumeric } from '@/shared-kernel';
import {
  BaseSubResourceRepository,
  OrderByConfig,
  FindAllFilters,
  buildUpdateData,
  buildCreateData,
} from './base';

/**
 * Repository for Skill entities
 *
 * Ordering strategy: Multi-field (category ASC, then order ASC)
 * Rationale: Skills are logically grouped by category (e.g., "Frontend", "Backend", "DevOps").
 * Primary sort by category keeps related skills together. Secondary sort by order field
 * allows manual reordering within each category via drag-and-drop. This two-level hierarchy
 * provides both logical grouping and user control.
 */
@Injectable()
export class SkillRepository extends BaseSubResourceRepository<
  Skill,
  CreateSkill,
  UpdateSkill
> {
  protected readonly logger = new Logger(SkillRepository.name);
  private categoryFilter?: string; // Instance variable for category filtering

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getPrismaDelegate() {
    return this.prisma.skill;
  }

  protected getOrderByConfig(): OrderByConfig {
    return {
      type: 'multiple',
      fields: [
        { field: 'category', direction: 'asc' },
        { field: 'order', direction: 'asc' },
      ],
    };
  }

  /**
   * Override to add category filtering support
   */
  protected getFindAllFilters(): FindAllFilters {
    if (this.categoryFilter) {
      return { category: this.categoryFilter };
    }
    return {};
  }

  /**
   * Override to scope maxOrder by category
   */
  protected getMaxOrderScope(dto?: CreateSkill): Record<string, unknown> {
    if (dto && 'category' in dto) {
      return { category: dto.category };
    }
    return {};
  }

  /**
   * Override findAll to accept optional category parameter
   */
  async findAllSkillsForResume(
    resumeId: string,
    page: number = PAGINATION.DEFAULT_PAGE,
    limit: number = PAGINATION.DEFAULT_PAGE_SIZE,
    category?: string,
  ): Promise<PaginatedResult<Skill>> {
    this.categoryFilter = category;
    const paginatedSkills = await super.findAllEntitiesForResume(
      resumeId,
      page,
      limit,
    );
    this.categoryFilter = undefined; // Clean up
    return paginatedSkills;
  }

  protected mapCreate(resumeId: string, dto: CreateSkill, order: number) {
    return buildCreateData({ resumeId, order: dto.order ?? order }, dto, {
      name: 'string',
      category: 'string',
      level: 'optional',
    });
  }

  protected mapUpdate(dto: UpdateSkill) {
    return buildUpdateData(dto, {
      name: 'string',
      category: 'string',
      level: 'optional',
      order: 'number',
    });
  }

  // ============================================================================
  // SKILL-SPECIFIC METHODS (not in ISubResourceRepository interface)
  // ============================================================================

  /**
   * Create multiple skills at once
   * Special method for bulk skill import
   */
  async createMany(resumeId: string, skills: CreateSkill[]): Promise<number> {
    const result = await this.prisma.skill.createMany({
      data: skills.map((skill, index) => ({
        resumeId,
        name: skill.name,
        category: skill.category ?? 'General',
        level: SkillLevelToNumeric[skill.level],
        order: skill.order ?? index,
      })),
    });
    return result.count;
  }

  /**
   * Delete all skills in a specific category
   * Useful for resetting/replacing entire skill categories
   */
  async deleteByCategory(resumeId: string, category: string): Promise<number> {
    const result = await this.prisma.skill.deleteMany({
      where: { resumeId, category },
    });
    return result.count;
  }

  /**
   * Get all unique skill categories for a resume
   * Used for UI category filters and grouping
   */
  async getCategories(resumeId: string): Promise<string[]> {
    const result = await this.prisma.skill.findMany({
      where: { resumeId },
      select: { category: true },
      distinct: ['category'],
    });
    return result.map((r) => r.category);
  }
}
