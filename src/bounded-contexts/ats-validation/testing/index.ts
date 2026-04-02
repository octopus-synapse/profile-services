/**
 * ATS Validation Testing Module
 *
 * In-memory implementations for testing ATS validation functionality.
 */

import type { SectionSemanticCatalogPort, SemanticResumeSnapshot } from '../ats/interfaces';

interface StoredResumeSection {
  id: string;
  resumeId: string;
  sectionTypeId: string;
  order: number;
  isVisible: boolean;
  titleOverride: string | null;
  sectionType: StoredSectionType;
  items: StoredSectionItem[];
}

interface StoredSectionType {
  id: string;
  key: string;
  version: number;
  semanticKind: string;
  title: string;
  isActive: boolean;
  definition: unknown;
  translations?: unknown;
}

interface StoredSectionItem {
  id: string;
  resumeSectionId: string;
  order: number;
  isVisible: boolean;
  content: unknown;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * In-Memory Prisma Service for ATS Validation testing
 */
export class InMemoryAtsValidationPrismaService {
  private resumeSections: StoredResumeSection[] = [];
  private sectionTypes: StoredSectionType[] = [];

  resumeSection = {
    findMany: async (args?: { where?: { resumeId?: string }; include?: unknown }) => {
      let sections = this.resumeSections;

      if (args?.where?.resumeId) {
        sections = sections.filter((s) => s.resumeId === args.where?.resumeId);
      }

      // Return with includes if requested
      if (args?.include) {
        return sections.map((section) => ({
          ...section,
          sectionType: section.sectionType,
          items: section.items,
        }));
      }

      return sections;
    },
  };

  sectionType = {
    findMany: async (args?: { where?: { isActive?: boolean } }) => {
      let types = this.sectionTypes;

      if (args?.where?.isActive !== undefined) {
        types = types.filter((t) => t.isActive === args.where?.isActive);
      }

      return types;
    },
  };

  // Test helpers
  seedResumeSection(section: Partial<StoredResumeSection> & { id: string }): void {
    const defaultSection: StoredResumeSection = {
      id: section.id,
      resumeId: section.resumeId ?? 'resume-1',
      sectionTypeId: section.sectionTypeId ?? 'type-1',
      order: section.order ?? 0,
      isVisible: section.isVisible ?? true,
      titleOverride: section.titleOverride ?? null,
      sectionType: section.sectionType ?? {
        id: 'type-1',
        key: 'work_experience_v1',
        version: 1,
        semanticKind: 'WORK_EXPERIENCE',
        title: 'Work Experience',
        isActive: true,
        definition: {
          schemaVersion: 1,
          kind: 'WORK_EXPERIENCE',
          fields: [],
        },
      },
      items: section.items ?? [],
    };

    this.resumeSections.push(defaultSection);
  }

  seedSectionType(type: Partial<StoredSectionType> & { key: string }): void {
    const defaultType: StoredSectionType = {
      id: type.id ?? `type-${type.key}`,
      key: type.key,
      version: type.version ?? 1,
      semanticKind: type.semanticKind ?? type.key.toUpperCase(),
      title: type.title ?? type.key,
      isActive: type.isActive ?? true,
      definition: type.definition ?? {
        schemaVersion: 1,
        kind: type.semanticKind ?? 'CUSTOM',
        fields: [],
      },
      translations: type.translations,
    };

    this.sectionTypes.push(defaultType);
  }

  clear(): void {
    this.resumeSections = [];
    this.sectionTypes = [];
  }
}

/**
 * In-Memory Section Semantic Catalog Adapter
 */
export class InMemorySectionSemanticCatalogAdapter implements SectionSemanticCatalogPort {
  private snapshots = new Map<string, SemanticResumeSnapshot>();

  async getSemanticResumeSnapshot(resumeId: string): Promise<SemanticResumeSnapshot> {
    const snapshot = this.snapshots.get(resumeId);

    if (!snapshot) {
      return {
        resumeId,
        items: [],
        sectionTypeCatalog: [],
      };
    }

    return snapshot;
  }

  // Test helpers
  seedSnapshot(snapshot: SemanticResumeSnapshot): void {
    this.snapshots.set(snapshot.resumeId, snapshot);
  }

  clear(): void {
    this.snapshots.clear();
  }
}
