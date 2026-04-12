import type {
  CreateSectionTypeDto,
  ListSectionTypesQueryDto,
  SectionTypeListResponseDto,
  SectionTypeResponseDto,
  UpdateSectionTypeDto,
} from '../../dto';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

export type SectionTypeRecord = {
  id: string;
  key: string;
  slug: string;
  title: string;
  description: string | null;
  semanticKind: string;
  version: number;
  isActive: boolean;
  isSystem: boolean;
  isRepeatable: boolean;
  minItems: number;
  maxItems: number | null;
  definition: JsonValue;
  uiSchema: JsonValue | null;
  renderHints: JsonValue;
  fieldStyles: JsonValue;
  iconType: string;
  icon: string;
  translations: JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

export type SectionTypeFilter = {
  isActive?: boolean;
  semanticKind?: string;
  search?: string;
};

export type CreateSectionTypeData = {
  key: string;
  slug: string;
  title: string;
  description?: string;
  semanticKind: string;
  version?: number;
  isActive?: boolean;
  isSystem?: boolean;
  isRepeatable?: boolean;
  minItems?: number;
  maxItems?: number;
  definition: JsonValue;
  uiSchema?: JsonValue;
  renderHints?: JsonValue;
  fieldStyles?: JsonValue;
  iconType?: string;
  icon?: string;
  translations?: JsonValue;
};

export type UpdateSectionTypeData = {
  [K in keyof CreateSectionTypeData]?: CreateSectionTypeData[K] | null;
};

export abstract class AdminSectionTypesRepositoryPort {
  abstract findMany(
    filter: SectionTypeFilter,
    skip: number,
    take: number,
  ): Promise<SectionTypeRecord[]>;

  abstract count(filter: SectionTypeFilter): Promise<number>;

  abstract findByKey(key: string): Promise<SectionTypeRecord | null>;

  abstract findBySlugAndVersion(
    slug: string,
    version: number,
    excludeId?: string,
  ): Promise<SectionTypeRecord | null>;

  abstract create(data: CreateSectionTypeData): Promise<SectionTypeRecord>;

  abstract update(key: string, data: UpdateSectionTypeData): Promise<SectionTypeRecord>;

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
