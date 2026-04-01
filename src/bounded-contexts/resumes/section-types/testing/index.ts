/**
 * Section Types Testing Module
 *
 * In-memory implementations for unit testing section types service.
 * Following clean architecture - no Prisma, no mocks.
 */

import { Prisma } from '@prisma/client';

export type SectionTypeEntity = {
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
  definition: Prisma.JsonValue;
  uiSchema: Prisma.JsonValue | null;
  renderHints: Prisma.JsonValue | null;
  fieldStyles: Prisma.JsonValue | null;
  iconType: string;
  icon: string;
  translations: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

export type ResumeSectionEntity = {
  id: string;
  resumeId: string;
  sectionTypeId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// In-Memory Section Types Repository
// ============================================================================

export class InMemorySectionTypesRepository {
  private sectionTypes = new Map<string, SectionTypeEntity>();
  private resumeSections = new Map<string, ResumeSectionEntity>();
  private idCounter = 1;

  // ========== Section Type Operations ==========

  async findMany(params?: {
    where?: {
      OR?: Array<
        | { key?: { contains: string; mode: 'insensitive' } }
        | { title?: { contains: string; mode: 'insensitive' } }
        | { slug?: { contains: string; mode: 'insensitive' } }
      >;
      isActive?: boolean;
      semanticKind?: string;
    };
    skip?: number;
    take?: number;
    orderBy?: { createdAt: 'desc' | 'asc' };
    select?: { semanticKind: true };
    distinct?: ['semanticKind'];
  }): Promise<SectionTypeEntity[] | Array<{ semanticKind: string }>> {
    let results = Array.from(this.sectionTypes.values());

    if (params?.where) {
      const { OR, isActive, semanticKind } = params.where;

      if (OR) {
        results = results.filter((st) => {
          return OR.some((condition) => {
            if ('key' in condition && condition.key) {
              return st.key.toLowerCase().includes(condition.key.contains.toLowerCase());
            }
            if ('title' in condition && condition.title) {
              return st.title.toLowerCase().includes(condition.title.contains.toLowerCase());
            }
            if ('slug' in condition && condition.slug) {
              return st.slug.toLowerCase().includes(condition.slug.contains.toLowerCase());
            }
            return false;
          });
        });
      }

      if (isActive !== undefined) {
        results = results.filter((st) => st.isActive === isActive);
      }

      if (semanticKind) {
        results = results.filter((st) => st.semanticKind === semanticKind);
      }
    }

    if (params?.orderBy?.createdAt) {
      const orderDirection = params.orderBy.createdAt;
      results.sort((a, b) => {
        const order = orderDirection === 'desc' ? -1 : 1;
        return order * (a.createdAt.getTime() - b.createdAt.getTime());
      });
    }

    if (params?.skip !== undefined && params?.take !== undefined) {
      results = results.slice(params.skip, params.skip + params.take);
    }

    if (params?.select?.semanticKind && params?.distinct?.includes('semanticKind')) {
      const uniqueKinds = [...new Set(results.map((r) => r.semanticKind))].sort();
      return uniqueKinds.map((semanticKind) => ({ semanticKind }));
    }

    return results;
  }

  async findUnique(params: { where: { key: string } }): Promise<SectionTypeEntity | null> {
    return this.sectionTypes.get(params.where.key) ?? null;
  }

  async findFirst(params: {
    where: { slug: string; version: number; id?: { not: string } };
  }): Promise<SectionTypeEntity | null> {
    const results = Array.from(this.sectionTypes.values()).filter((st) => {
      if (st.slug !== params.where.slug || st.version !== params.where.version) {
        return false;
      }
      if (params.where.id?.not && st.id === params.where.id.not) {
        return false;
      }
      return true;
    });
    return results[0] ?? null;
  }

  async create(params: {
    data: {
      key: string;
      slug: string;
      title: string;
      description?: string | null;
      semanticKind: string;
      version: number;
      isRepeatable: boolean;
      minItems: number;
      maxItems?: number | null;
      definition: Prisma.InputJsonValue;
      uiSchema?: Prisma.InputJsonValue;
      renderHints?: Prisma.InputJsonValue;
      fieldStyles?: Prisma.InputJsonValue;
      iconType: string;
      icon: string;
      translations: Prisma.InputJsonValue;
      isSystem: boolean;
      isActive: boolean;
    };
  }): Promise<SectionTypeEntity> {
    const id = `st-${this.idCounter++}`;
    const now = new Date();
    const sectionType: SectionTypeEntity = {
      id,
      key: params.data.key,
      slug: params.data.slug,
      title: params.data.title,
      description: params.data.description ?? null,
      semanticKind: params.data.semanticKind,
      version: params.data.version,
      isActive: params.data.isActive,
      isSystem: params.data.isSystem,
      isRepeatable: params.data.isRepeatable,
      minItems: params.data.minItems,
      maxItems: params.data.maxItems ?? null,
      definition: params.data.definition as Prisma.JsonValue,
      uiSchema: (params.data.uiSchema ?? null) as Prisma.JsonValue | null,
      renderHints: (params.data.renderHints ?? null) as Prisma.JsonValue | null,
      fieldStyles: (params.data.fieldStyles ?? null) as Prisma.JsonValue | null,
      iconType: params.data.iconType,
      icon: params.data.icon,
      translations: params.data.translations as Prisma.JsonValue,
      createdAt: now,
      updatedAt: now,
    };
    this.sectionTypes.set(params.data.key, sectionType);
    return sectionType;
  }

  async update(params: {
    where: { key: string };
    data: {
      slug?: string;
      title?: string;
      description?: string;
      isActive?: boolean;
      isRepeatable?: boolean;
      minItems?: number;
      maxItems?: number | null;
      definition?: Prisma.InputJsonValue;
      uiSchema?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
      renderHints?: Prisma.InputJsonValue;
      fieldStyles?: Prisma.InputJsonValue;
      iconType?: string;
      icon?: string;
      translations?: Prisma.InputJsonValue;
    };
  }): Promise<SectionTypeEntity | null> {
    const existing = this.sectionTypes.get(params.where.key);
    if (!existing) {
      return null;
    }

    const updated: SectionTypeEntity = {
      ...existing,
      slug: params.data.slug ?? existing.slug,
      title: params.data.title ?? existing.title,
      description:
        params.data.description !== undefined ? params.data.description : existing.description,
      isActive: params.data.isActive ?? existing.isActive,
      isRepeatable: params.data.isRepeatable ?? existing.isRepeatable,
      minItems: params.data.minItems ?? existing.minItems,
      maxItems: params.data.maxItems !== undefined ? params.data.maxItems : existing.maxItems,
      definition: (params.data.definition ?? existing.definition) as Prisma.JsonValue,
      uiSchema: (params.data.uiSchema !== undefined
        ? params.data.uiSchema === Prisma.JsonNull
          ? null
          : params.data.uiSchema
        : existing.uiSchema) as Prisma.JsonValue | null,
      renderHints: (params.data.renderHints ?? existing.renderHints) as Prisma.JsonValue | null,
      fieldStyles: (params.data.fieldStyles ?? existing.fieldStyles) as Prisma.JsonValue | null,
      iconType: params.data.iconType ?? existing.iconType,
      icon: params.data.icon ?? existing.icon,
      translations: (params.data.translations ?? existing.translations) as Prisma.JsonValue,
      updatedAt: new Date(),
    };

    this.sectionTypes.set(params.where.key, updated);
    return updated;
  }

  async delete(params: { where: { key: string } }): Promise<SectionTypeEntity | null> {
    const existing = this.sectionTypes.get(params.where.key);
    if (!existing) {
      return null;
    }
    this.sectionTypes.delete(params.where.key);
    return existing;
  }

  async count(params?: {
    where?: {
      OR?: Array<
        | { key?: { contains: string; mode: 'insensitive' } }
        | { title?: { contains: string; mode: 'insensitive' } }
        | { slug?: { contains: string; mode: 'insensitive' } }
      >;
      isActive?: boolean;
      semanticKind?: string;
    };
  }): Promise<number> {
    const results = (await this.findMany(params)) as SectionTypeEntity[];
    return results.length;
  }

  // ========== Resume Section Operations ==========

  async countResumeSections(params: { where: { sectionTypeId: string } }): Promise<number> {
    return Array.from(this.resumeSections.values()).filter(
      (rs) => rs.sectionTypeId === params.where.sectionTypeId,
    ).length;
  }

  // ========== Test Helpers ==========

  seedSectionType(input: Partial<SectionTypeEntity> & { key: string }): void {
    const now = new Date();
    const sectionType: SectionTypeEntity = {
      id: input.id ?? `st-${this.idCounter++}`,
      key: input.key,
      slug: input.slug ?? input.key.replace(/_v\d+$/, ''),
      title: input.title ?? input.key,
      description: input.description ?? null,
      semanticKind: input.semanticKind ?? 'CUSTOM',
      version: input.version ?? 1,
      isActive: input.isActive ?? true,
      isSystem: input.isSystem ?? false,
      isRepeatable: input.isRepeatable ?? true,
      minItems: input.minItems ?? 0,
      maxItems: input.maxItems ?? null,
      definition: input.definition ?? { fields: [] },
      uiSchema: input.uiSchema ?? null,
      renderHints: input.renderHints ?? null,
      fieldStyles: input.fieldStyles ?? null,
      iconType: input.iconType ?? 'emoji',
      icon: input.icon ?? '📄',
      translations: input.translations ?? {
        en: { title: input.title ?? input.key, label: input.key },
      },
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };
    this.sectionTypes.set(sectionType.key, sectionType);
  }

  seedResumeSection(
    input: Partial<ResumeSectionEntity> & { resumeId: string; sectionTypeId: string },
  ): void {
    const now = new Date();
    const resumeSection: ResumeSectionEntity = {
      id: input.id ?? `rs-${this.idCounter++}`,
      resumeId: input.resumeId,
      sectionTypeId: input.sectionTypeId,
      order: input.order ?? 0,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };
    this.resumeSections.set(resumeSection.id, resumeSection);
  }

  getSectionType(key: string): SectionTypeEntity | undefined {
    return this.sectionTypes.get(key);
  }

  getAllSectionTypes(): SectionTypeEntity[] {
    return Array.from(this.sectionTypes.values());
  }

  clear(): void {
    this.sectionTypes.clear();
    this.resumeSections.clear();
    this.idCounter = 1;
  }
}
