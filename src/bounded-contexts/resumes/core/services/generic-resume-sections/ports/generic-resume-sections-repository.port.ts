import type { Prisma, ResumeSection, SectionItem, SectionType } from '@prisma/client';

// Use Prisma-generated types for consistency
export type SectionTypeDto = SectionType & Record<string, unknown>;

export type ResumeSectionDto = ResumeSection & {
  sectionType: SectionTypeDto | null;
  items: SectionItemDto[];
} & Record<string, unknown>;

export type SectionItemDto = SectionItem & Record<string, unknown>;

export abstract class GenericResumeSectionsRepositoryPort {
  abstract runInTransaction<T>(
    operation: (repository: GenericResumeSectionsRepositoryPort) => Promise<T>,
  ): Promise<T>;

  abstract findActiveSectionTypes(): Promise<SectionTypeDto[]>;

  abstract findResumeOwner(resumeId: string): Promise<{ id: string; userId: string } | null>;

  abstract findResumeSections(resumeId: string): Promise<ResumeSectionDto[]>;

  abstract findActiveSectionTypeByKey(sectionTypeKey: string): Promise<{
    id: string;
    key: string;
    maxItems: number | null;
    definition: unknown;
  } | null>;

  abstract findResumeSection(
    resumeId: string,
    sectionTypeId: string,
  ): Promise<{ id: string } | null>;

  abstract createResumeSection(
    resumeId: string,
    sectionTypeId: string,
    order: number,
  ): Promise<{ id: string }>;

  abstract countSectionItems(resumeSectionId: string): Promise<number>;

  abstract findSectionItemForResumeAndType(
    itemId: string,
    resumeId: string,
    sectionTypeId: string,
  ): Promise<{ id: string } | null>;

  abstract createSectionItem(
    resumeSectionId: string,
    order: number,
    content: Prisma.InputJsonValue,
  ): Promise<SectionItemDto>;

  abstract updateSectionItem(
    itemId: string,
    content: Prisma.InputJsonValue,
  ): Promise<SectionItemDto>;

  abstract deleteSectionItem(itemId: string): Promise<SectionItemDto>;

  abstract findMaxResumeSectionOrder(resumeId: string): Promise<{ _max: { order: number | null } }>;

  abstract findMaxSectionItemOrder(
    resumeSectionId: string,
  ): Promise<{ _max: { order: number | null } }>;
}

export const GENERIC_RESUME_SECTIONS_USE_CASES = Symbol('GENERIC_RESUME_SECTIONS_USE_CASES');

export interface GenericResumeSectionsUseCases {
  listSectionTypesUseCase: {
    execute: () => Promise<SectionTypeDto[]>;
  };
  listResumeSectionsUseCase: {
    execute: (resumeId: string, userId: string) => Promise<ResumeSectionDto[]>;
  };
  createSectionItemUseCase: {
    execute: (
      resumeId: string,
      sectionTypeKey: string,
      userId: string,
      content: Record<string, unknown>,
    ) => Promise<SectionItemDto>;
  };
  updateSectionItemUseCase: {
    execute: (
      resumeId: string,
      sectionTypeKey: string,
      itemId: string,
      userId: string,
      content: Record<string, unknown>,
    ) => Promise<SectionItemDto>;
  };
  deleteSectionItemUseCase: {
    execute: (
      resumeId: string,
      sectionTypeKey: string,
      itemId: string,
      userId: string,
    ) => Promise<void>;
  };
}
