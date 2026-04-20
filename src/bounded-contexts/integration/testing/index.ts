/**
 * Integration Testing Module
 *
 * In-memory implementations for testing integration functionality.
 */

import type { Prisma } from '@prisma/client';

/**
 * Resume entity for integration context
 */
interface Resume {
  id: string;
  userId: string;
  github?: string | null;
  totalStars?: number | null;
}

/**
 * Section type entity
 */
interface SectionType {
  id: string;
  semanticKind: string;
  isActive: boolean;
}

/**
 * Resume section entity
 */
interface ResumeSection {
  id: string;
  resumeId: string;
  sectionTypeId: string;
}

/**
 * Section item entity
 */
interface SectionItem {
  id: string;
  resumeSectionId: string;
  order: number;
  content: Prisma.JsonValue;
}

/**
 * In-Memory Resume Repository
 */
export class InMemoryResumeRepository {
  private resumes = new Map<string, Resume>();

  async findUnique(id: string, _include?: { resumeSections?: boolean }): Promise<Resume | null> {
    return this.resumes.get(id) ?? null;
  }

  async update(id: string, data: Partial<Resume>): Promise<Resume> {
    const resume = this.resumes.get(id);
    if (!resume) {
      throw new Error(`Resume ${id} not found`);
    }

    const updated: Resume = {
      ...resume,
      ...data,
    };

    this.resumes.set(id, updated);
    return updated;
  }

  // Test helpers
  seedResume(resume: Resume): void {
    this.resumes.set(resume.id, resume);
  }

  getResume(id: string): Resume | undefined {
    return this.resumes.get(id);
  }

  clear(): void {
    this.resumes.clear();
  }
}

/**
 * In-Memory Section Type Repository
 */
export class InMemorySectionTypeRepository {
  private sectionTypes = new Map<string, SectionType>();

  async findFirst(semanticKind: string): Promise<SectionType | null> {
    for (const sectionType of this.sectionTypes.values()) {
      if (sectionType.semanticKind === semanticKind && sectionType.isActive) {
        return sectionType;
      }
    }
    return null;
  }

  // Test helpers
  seedSectionType(sectionType: SectionType): void {
    this.sectionTypes.set(sectionType.id, sectionType);
  }

  clear(): void {
    this.sectionTypes.clear();
  }
}

/**
 * In-Memory Resume Section Repository
 */
export class InMemoryResumeSectionRepository {
  private resumeSections = new Map<string, ResumeSection>();
  private idCounter = 1;

  async upsert(resumeId: string, sectionTypeId: string): Promise<{ id: string }> {
    const existing = Array.from(this.resumeSections.values()).find(
      (rs) => rs.resumeId === resumeId && rs.sectionTypeId === sectionTypeId,
    );

    if (existing) {
      return { id: existing.id };
    }

    const id = `resume-section-${this.idCounter++}`;
    const resumeSection: ResumeSection = {
      id,
      resumeId,
      sectionTypeId,
    };
    this.resumeSections.set(id, resumeSection);
    return { id };
  }

  // Test helpers
  clear(): void {
    this.resumeSections.clear();
    this.idCounter = 1;
  }
}

/**
 * In-Memory Section Item Repository
 */
export class InMemorySectionItemRepository {
  private sectionItems = new Map<string, SectionItem>();
  private idCounter = 1;

  async deleteMany(filter: {
    resumeSectionId?: string;
    resumeId?: string;
    semanticKind?: string;
    contentFilter?: { path: string[]; value: string };
  }): Promise<{ count: number }> {
    let deletedCount = 0;
    for (const [id, item] of this.sectionItems.entries()) {
      let shouldDelete = false;

      if (filter.resumeSectionId && item.resumeSectionId === filter.resumeSectionId) {
        shouldDelete = true;
      }

      if (filter.contentFilter) {
        const content = item.content as Record<string, unknown>;
        let value: unknown = content;
        for (const key of filter.contentFilter.path) {
          value = (value as Record<string, unknown>)?.[key];
        }
        if (typeof value === 'string' && value.includes(filter.contentFilter.value)) {
          shouldDelete = true;
        }
      }

      if (shouldDelete) {
        this.sectionItems.delete(id);
        deletedCount++;
      }
    }
    return { count: deletedCount };
  }

  async createMany(
    items: Array<{ resumeSectionId: string; order: number; content: Prisma.JsonValue }>,
  ): Promise<{ count: number }> {
    for (const item of items) {
      const id = `section-item-${this.idCounter++}`;
      const sectionItem: SectionItem = {
        id,
        resumeSectionId: item.resumeSectionId,
        order: item.order,
        content: item.content,
      };
      this.sectionItems.set(id, sectionItem);
    }
    return { count: items.length };
  }

  async count(resumeSectionId: string): Promise<number> {
    return Array.from(this.sectionItems.values()).filter(
      (item) => item.resumeSectionId === resumeSectionId,
    ).length;
  }

  // Test helpers
  clear(): void {
    this.sectionItems.clear();
    this.idCounter = 1;
  }

  getItems(): SectionItem[] {
    return Array.from(this.sectionItems.values());
  }
}

/**
 * In-Memory Transaction Handler
 */
export class InMemoryTransactionHandler {
  async execute<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
    const results: T[] = [];
    for (const operation of operations) {
      results.push(await operation());
    }
    return results;
  }
}
