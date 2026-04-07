import type { Prisma } from '@prisma/client';
import type {
  CreateSectionTypeDto,
  ListSectionTypesQueryDto,
  SectionTypeListResponseDto,
  SectionTypeResponseDto,
  UpdateSectionTypeDto,
} from '../../dto';

export type SectionTypeRecord = Prisma.SectionTypeGetPayload<object>;

export abstract class AdminSectionTypesRepositoryPort {
  abstract findMany(
    where: Prisma.SectionTypeWhereInput,
    skip: number,
    take: number,
  ): Promise<SectionTypeRecord[]>;

  abstract count(where: Prisma.SectionTypeWhereInput): Promise<number>;

  abstract findByKey(key: string): Promise<SectionTypeRecord | null>;

  abstract findBySlugAndVersion(
    slug: string,
    version: number,
    excludeId?: string,
  ): Promise<SectionTypeRecord | null>;

  abstract create(data: Prisma.SectionTypeCreateInput): Promise<SectionTypeRecord>;

  abstract update(key: string, data: Prisma.SectionTypeUpdateInput): Promise<SectionTypeRecord>;

  abstract delete(key: string): Promise<void>;

  abstract countResumeSectionsForType(sectionTypeId: string): Promise<number>;

  abstract findDistinctSemanticKinds(): Promise<string[]>;
}

export const ADMIN_SECTION_TYPES_USE_CASES = Symbol('ADMIN_SECTION_TYPES_USE_CASES');

export interface AdminSectionTypesUseCases {
  listSectionTypesAdminUseCase: {
    execute: (query: ListSectionTypesQueryDto) => Promise<SectionTypeListResponseDto>;
  };
  getSectionTypeUseCase: {
    execute: (key: string) => Promise<SectionTypeResponseDto>;
  };
  createSectionTypeUseCase: {
    execute: (dto: CreateSectionTypeDto) => Promise<SectionTypeResponseDto>;
  };
  updateSectionTypeUseCase: {
    execute: (key: string, dto: UpdateSectionTypeDto) => Promise<SectionTypeResponseDto>;
  };
  deleteSectionTypeUseCase: {
    execute: (key: string) => Promise<void>;
  };
  getSemanticKindsUseCase: {
    execute: () => Promise<string[]>;
  };
}
