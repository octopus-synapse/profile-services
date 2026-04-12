/**
 * In-Memory Generic Resume Sections Repository
 *
 * Test double for GenericResumeSectionsRepositoryPort
 */

import type { Prisma } from '@prisma/client';
import {
  GenericResumeSectionsRepositoryPort,
  type ResumeSectionDto,
  type SectionItemDto,
  type SectionTypeDto,
} from '../services/generic-resume-sections/ports/generic-resume-sections-repository.port';

type ResumeEntity = {
  id: string;
  userId: string;
};

export class InMemoryGenericResumeSectionsRepository extends GenericResumeSectionsRepositoryPort {
  private sectionTypes = new Map<string, SectionTypeDto>();
  private resumes = new Map<string, ResumeEntity>();
  private resumeSections = new Map<string, ResumeSectionDto>();
  private sectionItems = new Map<string, SectionItemDto>();
  private idCounter = 1;

  async runInTransaction<T>(
    operation: (repository: GenericResumeSectionsRepositoryPort) => Promise<T>,
  ): Promise<T> {
    return operation(this);
  }

  async findActiveSectionTypes(): Promise<SectionTypeDto[]> {
    return Array.from(this.sectionTypes.values())
      .filter((st) => st.isActive)
      .sort((a, b) => {
        const kindCompare = a.semanticKind.localeCompare(b.semanticKind);
        if (kindCompare !== 0) return kindCompare;
        const titleCompare = a.title.localeCompare(b.title);
        if (titleCompare !== 0) return titleCompare;
        return b.version - a.version;
      });
  }

  async findResumeOwner(resumeId: string): Promise<{ id: string; userId: string } | null> {
    return this.resumes.get(resumeId) ?? null;
  }

  async findResumeSections(resumeId: string): Promise<ResumeSectionDto[]> {
    return Array.from(this.resumeSections.values())
      .filter((rs) => rs.resumeId === resumeId)
      .map((rs) => ({
        ...rs,
        sectionType: this.sectionTypes.get(rs.sectionTypeId) ?? null,
        items: Array.from(this.sectionItems.values())
          .filter((item) => item.resumeSectionId === rs.id)
          .sort((a, b) => a.order - b.order),
      }))
      .sort((a, b) => a.order - b.order);
  }

  async findActiveSectionTypeByKey(sectionTypeKey: string): Promise<{
    id: string;
    key: string;
    maxItems: number | null;
    definition: unknown;
  } | null> {
    const sectionType = Array.from(this.sectionTypes.values()).find(
      (st) => st.key === sectionTypeKey && st.isActive,
    );

    if (!sectionType) return null;

    return {
      id: sectionType.id,
      key: sectionType.key,
      maxItems: sectionType.maxItems,
      definition: sectionType.definition,
    };
  }

  async findResumeSection(resumeId: string, sectionTypeId: string): Promise<{ id: string } | null> {
    const resumeSection = Array.from(this.resumeSections.values()).find(
      (rs) => rs.resumeId === resumeId && rs.sectionTypeId === sectionTypeId,
    );
    return resumeSection ? { id: resumeSection.id } : null;
  }

  async createResumeSection(
    resumeId: string,
    sectionTypeId: string,
    order: number,
  ): Promise<{ id: string }> {
    const id = `resume-section-${this.idCounter++}`;
    const now = new Date();
    const resumeSection: ResumeSectionDto = {
      id,
      resumeId,
      sectionTypeId,
      order,
      isVisible: true,
      titleOverride: null,
      createdAt: now,
      updatedAt: now,
      sectionType: this.sectionTypes.get(sectionTypeId) ?? null,
      items: [],
    };
    this.resumeSections.set(id, resumeSection);
    return { id };
  }

  async countSectionItems(resumeSectionId: string): Promise<number> {
    return Array.from(this.sectionItems.values()).filter(
      (item) => item.resumeSectionId === resumeSectionId,
    ).length;
  }

  async findSectionItemForResumeAndType(
    itemId: string,
    resumeId: string,
    sectionTypeId: string,
  ): Promise<{ id: string } | null> {
    const item = this.sectionItems.get(itemId);
    if (!item) return null;

    const resumeSection = this.resumeSections.get(item.resumeSectionId);
    if (!resumeSection) return null;

    if (resumeSection.resumeId === resumeId && resumeSection.sectionTypeId === sectionTypeId) {
      return { id: item.id };
    }

    return null;
  }

  async createSectionItem(
    resumeSectionId: string,
    order: number,
    content: Prisma.InputJsonValue,
  ): Promise<SectionItemDto> {
    const id = `item-${this.idCounter++}`;
    const now = new Date();
    const item: SectionItemDto = {
      id,
      resumeSectionId,
      order,
      isVisible: true,
      content: content as Prisma.JsonValue,
      createdAt: now,
      updatedAt: now,
    };
    this.sectionItems.set(id, item);
    return item;
  }

  async updateSectionItem(itemId: string, content: Prisma.InputJsonValue): Promise<SectionItemDto> {
    const item = this.sectionItems.get(itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    const updated: SectionItemDto = {
      ...item,
      content: content as Prisma.JsonValue,
      updatedAt: new Date(),
    };
    this.sectionItems.set(itemId, updated);
    return updated;
  }

  async deleteSectionItem(itemId: string): Promise<SectionItemDto> {
    const item = this.sectionItems.get(itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }
    this.sectionItems.delete(itemId);
    return item;
  }

  async findMaxResumeSectionOrder(resumeId: string): Promise<{ _max: { order: number | null } }> {
    const sections = Array.from(this.resumeSections.values()).filter(
      (rs) => rs.resumeId === resumeId,
    );
    const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order)) : null;
    return { _max: { order: maxOrder } };
  }

  async findMaxSectionItemOrder(
    resumeSectionId: string,
  ): Promise<{ _max: { order: number | null } }> {
    const items = Array.from(this.sectionItems.values()).filter(
      (item) => item.resumeSectionId === resumeSectionId,
    );
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order)) : null;
    return { _max: { order: maxOrder } };
  }

  // ========== Test Helpers ==========

  seedSectionType(input: Partial<SectionTypeDto> & { id: string; key: string }): void {
    const now = new Date();
    const sectionType: SectionTypeDto = {
      id: input.id,
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
      examples: input.examples ?? {},
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };
    this.sectionTypes.set(sectionType.id, sectionType);
  }

  seedResume(input: { id: string; userId: string }): void {
    this.resumes.set(input.id, input);
  }

  seedResumeSection(
    input: Partial<ResumeSectionDto> & { id: string; resumeId: string; sectionTypeId: string },
  ): void {
    const now = new Date();
    const resumeSection: ResumeSectionDto = {
      id: input.id,
      resumeId: input.resumeId,
      sectionTypeId: input.sectionTypeId,
      order: input.order ?? 0,
      isVisible: input.isVisible ?? true,
      titleOverride: input.titleOverride ?? null,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
      sectionType: this.sectionTypes.get(input.sectionTypeId) ?? null,
      items: [],
    };
    this.resumeSections.set(resumeSection.id, resumeSection);
  }

  seedSectionItem(
    input: Partial<SectionItemDto> & {
      id: string;
      resumeSectionId: string;
      content: Prisma.JsonValue;
    },
  ): void {
    const now = new Date();
    const item: SectionItemDto = {
      id: input.id,
      resumeSectionId: input.resumeSectionId,
      order: input.order ?? 0,
      isVisible: input.isVisible ?? true,
      content: input.content,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };
    this.sectionItems.set(item.id, item);
  }

  clear(): void {
    this.sectionTypes.clear();
    this.resumes.clear();
    this.resumeSections.clear();
    this.sectionItems.clear();
    this.idCounter = 1;
  }
}
