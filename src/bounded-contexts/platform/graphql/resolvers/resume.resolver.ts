import { Logger, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import type { User } from '@prisma/client';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import { GenericResumeSectionsService } from '@/bounded-contexts/resumes/resumes/services/generic-resume-sections.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { ResumeModel } from '../models/resume.model';
import { ResumeSectionModel } from '../models/resume-section.model';
import { SectionItemModel } from '../models/section-item.model';
import { SectionTypeModel } from '../models/section-type.model';

/**
 * GraphQL Resolver for Resume queries and mutations
 *
 * Uses generic sections API for all section operations.
 * Domain-specific mutations (addExperience, addEducation, etc.) have been
 * removed in favor of the unified createSectionItem/updateSectionItem/deleteSectionItem API.
 *
 * Issue #76: Design GraphQL schema with Code-First approach
 * Issue #77: Implement DataLoader for N+1 optimization
 */
@Resolver(() => ResumeModel)
@UseGuards(GqlAuthGuard)
export class ResumeResolver {
  private readonly logger = new Logger(ResumeResolver.name);

  constructor(
    private readonly resumesRepository: ResumesRepository,
    private readonly sectionsService: GenericResumeSectionsService,
  ) {}

  // ============================================================
  // Queries
  // ============================================================

  /**
   * Query: Get resume by ID
   */
  @Query(() => ResumeModel, {
    name: 'resume',
    description: 'Get a single resume by ID',
  })
  async getResume(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ): Promise<ResumeModel> {
    this.logger.log(`[GraphQL] Fetching resume ${id} for user ${user.id}`);
    const resume = await this.resumesRepository.findResumeByIdAndUserId(id, user.id);
    return resume as ResumeModel;
  }

  /**
   * Query: List all resumes for current user
   */
  @Query(() => [ResumeModel], {
    name: 'myResumes',
    description: 'Get all resumes for current user',
  })
  async getMyResumes(@CurrentUser() user: User): Promise<ResumeModel[]> {
    this.logger.log(`[GraphQL] Fetching resumes for user ${user.id}`);
    const resumes = await this.resumesRepository.findAllUserResumes(user.id);
    return resumes as ResumeModel[];
  }

  /**
   * Query: List available section types
   */
  @Query(() => [SectionTypeModel], {
    name: 'sectionTypes',
    description: 'List all available section types for resume sections',
  })
  async sectionTypes(@CurrentUser() _user: User): Promise<SectionTypeModel[]> {
    this.logger.log('[GraphQL] Fetching section types');
    const types = await this.sectionsService.listSectionTypes();
    return types.map((type) => ({
      key: type.key,
      semanticKind: type.semanticKind,
      displayName: type.title ?? type.key,
      description: type.description ?? undefined,
    }));
  }

  // ============================================================
  // Field Resolvers
  // ============================================================

  /**
   * Field Resolver: Load sections for a resume
   * Returns all sections with their items using the generic sections API
   */
  @ResolveField(() => [ResumeSectionModel])
  async sections(@Parent() resume: ResumeModel): Promise<ResumeSectionModel[]> {
    const sections = await this.sectionsService.listResumeSections(resume.id, resume.userId);

    return sections.map((section) => ({
      id: section.id,
      sectionTypeKey: section.sectionType?.key ?? 'unknown',
      semanticKind: section.sectionType?.semanticKind ?? 'CUSTOM',
      title: section.titleOverride ?? section.sectionType?.title ?? 'Section',
      order: section.order,
      visible: section.isVisible ?? true,
      items: section.items.map((item) => ({
        id: item.id,
        sectionTypeKey: section.sectionType?.key ?? 'unknown',
        content: this.asRecord(item.content),
        order: item.order,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    }));
  }

  // ============================================================
  // Mutations - Generic Sections API
  // ============================================================

  /**
   * Mutation: Create a section item with any section type
   */
  @Mutation(() => SectionItemModel, {
    description: 'Create a new section item with JSON content',
  })
  async createSectionItem(
    @Args('resumeId', { type: () => ID }) resumeId: string,
    @Args('sectionTypeKey') sectionTypeKey: string,
    @Args('content', {
      type: () => String,
      description: 'JSON-encoded content',
    })
    contentJson: Record<string, unknown>,
    @CurrentUser() user: User,
  ): Promise<SectionItemModel> {
    this.logger.log(
      `[GraphQL] Creating section item for resume ${resumeId}, type ${sectionTypeKey}`,
    );
    const content = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;

    const item = await this.sectionsService.createItem(resumeId, sectionTypeKey, user.id, content);

    return {
      id: item.id,
      sectionTypeKey,
      content: this.asRecord(item.content),
      order: item.order,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Mutation: Update a section item
   */
  @Mutation(() => SectionItemModel, {
    description: 'Update an existing section item with partial JSON content',
  })
  async updateSectionItem(
    @Args('resumeId', { type: () => ID }) resumeId: string,
    @Args('sectionTypeKey') sectionTypeKey: string,
    @Args('itemId', { type: () => ID }) itemId: string,
    @Args('content', {
      type: () => String,
      description: 'JSON-encoded partial content',
    })
    contentJson: Record<string, unknown>,
    @CurrentUser() user: User,
  ): Promise<SectionItemModel> {
    this.logger.log(`[GraphQL] Updating section item ${itemId} for resume ${resumeId}`);
    const content = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;

    const item = await this.sectionsService.updateItem(
      resumeId,
      sectionTypeKey,
      itemId,
      user.id,
      content,
    );

    return {
      id: item.id,
      sectionTypeKey,
      content: this.asRecord(item.content),
      order: item.order,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Mutation: Delete a section item
   */
  @Mutation(() => Boolean, {
    description: 'Delete a section item',
  })
  async deleteSectionItem(
    @Args('resumeId', { type: () => ID }) resumeId: string,
    @Args('sectionTypeKey') sectionTypeKey: string,
    @Args('itemId', { type: () => ID }) itemId: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    this.logger.log(`[GraphQL] Deleting section item ${itemId} for resume ${resumeId}`);
    await this.sectionsService.deleteItem(resumeId, sectionTypeKey, itemId, user.id);
    return true;
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }
}
