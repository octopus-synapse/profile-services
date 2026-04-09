/**
 * ATS Validation Testing Module
 *
 * In-memory implementations for testing ATS validation functionality.
 */

import type {
  SectionSemanticCatalogPort,
  SemanticResumeSnapshot,
  ThemeATSPort,
  ThemeForATSScoring,
  ThemeStyleConfig,
} from '../ats/interfaces';

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

/**
 * In-Memory Theme ATS Adapter
 *
 * For testing theme ATS scoring without database dependency.
 */
export class InMemoryThemeATSAdapter implements ThemeATSPort {
  private themes = new Map<string, ThemeForATSScoring>();

  async getThemeById(themeId: string): Promise<ThemeForATSScoring | null> {
    return this.themes.get(themeId) ?? null;
  }

  // Test helpers
  seed(theme: ThemeForATSScoring): void {
    this.themes.set(theme.id, theme);
  }

  seedMany(themes: ThemeForATSScoring[]): void {
    for (const theme of themes) {
      this.themes.set(theme.id, theme);
    }
  }

  clear(): void {
    this.themes.clear();
  }

  getAll(): ThemeForATSScoring[] {
    return Array.from(this.themes.values());
  }
}

/**
 * Factory function to create optimal ATS theme config for testing
 */
export function createOptimalATSThemeConfig(): ThemeStyleConfig {
  return {
    version: '1.0.0',
    layout: {
      type: 'single-column',
      paperSize: 'a4',
      margins: 'normal',
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'arial', body: 'arial' },
        fontSize: 'base',
        headingStyle: 'bold',
      },
      colors: {
        colors: {
          primary: '#000000',
          secondary: '#333333',
          background: '#FFFFFF',
          surface: '#FFFFFF',
          text: { primary: '#000000', secondary: '#333333', accent: '#000000' },
          border: '#CCCCCC',
          divider: '#CCCCCC',
        },
        borderRadius: 'none',
        shadows: 'none',
      },
      spacing: {
        density: 'comfortable',
        sectionGap: 'md',
        itemGap: 'sm',
        contentPadding: 'sm',
      },
    },
    sections: [
      { id: 'header', visible: true, order: 0, column: 'full-width' },
      { id: 'summary_v1', visible: true, order: 1, column: 'full-width' },
      { id: 'work_experience_v1', visible: true, order: 2, column: 'full-width' },
      { id: 'education_v1', visible: true, order: 3, column: 'full-width' },
      { id: 'skill_set_v1', visible: true, order: 4, column: 'full-width' },
    ],
  };
}

/**
 * Factory function to create suboptimal theme config for testing
 */
export function createSuboptimalATSThemeConfig(): ThemeStyleConfig {
  return {
    version: '1.0.0',
    layout: {
      type: 'two-column',
      paperSize: 'a4',
      margins: 'tight',
      columnDistribution: '70-30',
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'inter', body: 'roboto' },
        fontSize: 'base',
        headingStyle: 'accent-border',
      },
      colors: {
        colors: {
          primary: '#3B82F6',
          secondary: '#64748B',
          background: '#FFFFFF',
          surface: '#F8FAFC',
          text: { primary: '#1E293B', secondary: '#64748B', accent: '#3B82F6' },
          border: '#E2E8F0',
          divider: '#F1F5F9',
        },
        borderRadius: 'lg',
        shadows: 'subtle',
        gradients: { enabled: true, direction: 'to-right' },
      },
      spacing: {
        density: 'compact',
        sectionGap: 'sm',
        itemGap: 'xs',
        contentPadding: 'xs',
      },
    },
    sections: [
      { id: 'header', visible: true, order: 0, column: 'full-width' },
      { id: 'summary_v1', visible: true, order: 1, column: 'main' },
      { id: 'work_experience_v1', visible: true, order: 2, column: 'main' },
      { id: 'skill_set_v1', visible: true, order: 3, column: 'sidebar' },
      { id: 'education_v1', visible: true, order: 4, column: 'sidebar' },
    ],
  };
}
