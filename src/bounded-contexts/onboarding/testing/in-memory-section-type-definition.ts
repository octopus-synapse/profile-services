import type { SectionTypeData } from '../domain/config/onboarding-steps.config';
import { SectionTypeDefinitionPort } from '../domain/ports/section-type-definition.port';

export class InMemorySectionTypeDefinition extends SectionTypeDefinitionPort {
  private sectionTypes = new Map<string, SectionTypeData>();

  async findAll(_locale?: string): Promise<SectionTypeData[]> {
    return Array.from(this.sectionTypes.values());
  }

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  seedSectionType(data: SectionTypeData): void {
    this.sectionTypes.set(data.key, data);
  }

  seedSectionTypes(data: SectionTypeData[]): void {
    for (const st of data) {
      this.sectionTypes.set(st.key, st);
    }
  }

  getAll(): SectionTypeData[] {
    return Array.from(this.sectionTypes.values());
  }

  clear(): void {
    this.sectionTypes.clear();
  }
}

// ═══════════════════════════════════════════════════════════════
// Default Section Type Data for Tests
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_SECTION_TYPES: SectionTypeData[] = [
  {
    key: 'work_experience_v1',
    title: 'Work Experience',
    description: 'Professional work history',
    definition: { schemaVersion: 1, kind: 'WORK_EXPERIENCE', fields: [] },
    icon: '💼',
    iconType: 'emoji',
    label: 'Work Experience',
    noDataLabel: "I don't have work experience to add",
    placeholder: 'Add your work experience',
    addLabel: 'Add experience',
  },
  {
    key: 'education_v1',
    title: 'Education',
    description: 'Educational background',
    definition: { schemaVersion: 1, kind: 'EDUCATION', fields: [] },
    icon: '🎓',
    iconType: 'emoji',
    label: 'Education',
    noDataLabel: "I don't have education to add",
    placeholder: 'Add your education',
    addLabel: 'Add education',
  },
  {
    key: 'skill_set_v1',
    title: 'Skills',
    description: 'Technical and soft skills',
    definition: { schemaVersion: 1, kind: 'SKILL_SET', fields: [] },
    icon: '🛠️',
    iconType: 'emoji',
    label: 'Skills',
    noDataLabel: "I don't have skills to add",
    placeholder: 'Add your skills',
    addLabel: 'Add skill',
  },
  {
    key: 'language_v1',
    title: 'Languages',
    description: 'Language proficiencies',
    definition: { schemaVersion: 1, kind: 'LANGUAGE', fields: [] },
    icon: '🌍',
    iconType: 'emoji',
    label: 'Languages',
    noDataLabel: "I don't have languages to add",
    placeholder: 'Add your languages',
    addLabel: 'Add language',
  },
];
