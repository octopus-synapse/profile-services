import type { SectionTypeData } from '../domain/config/onboarding-steps.config';
import { SectionTypeDefinitionPort } from '../domain/ports/section-type-definition.port';

export class InMemorySectionTypeDefinition extends SectionTypeDefinitionPort {
  private sectionTypes = new Map<string, SectionTypeData>();

  async listAll(_locale?: string): Promise<SectionTypeData[]> {
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
  {
    key: 'soft_skill_set_v1',
    title: 'Soft Skills',
    description: 'Behavioural skills',
    definition: { schemaVersion: 1, kind: 'SOFT_SKILL_SET', fields: [] },
    icon: '🤝',
    iconType: 'emoji',
    label: 'Soft Skills',
    noDataLabel: "I don't have soft skills to add",
    placeholder: 'Add your soft skills',
    addLabel: 'Add soft skill',
  },
  {
    key: 'project_v1',
    title: 'Projects',
    description: 'Notable projects',
    definition: { schemaVersion: 1, kind: 'PROJECT', fields: [] },
    icon: '🚀',
    iconType: 'emoji',
    label: 'Projects',
    noDataLabel: "I don't have projects to add",
    placeholder: 'Add your projects',
    addLabel: 'Add project',
  },
  {
    key: 'certification_v1',
    title: 'Certifications',
    description: 'Professional certifications',
    definition: { schemaVersion: 1, kind: 'CERTIFICATION', fields: [] },
    icon: '📜',
    iconType: 'emoji',
    label: 'Certifications',
    noDataLabel: "I don't have certifications to add",
    placeholder: 'Add your certifications',
    addLabel: 'Add certification',
  },
  {
    key: 'award_v1',
    title: 'Awards',
    description: 'Awards and honors',
    definition: { schemaVersion: 1, kind: 'AWARD', fields: [] },
    icon: '🏆',
    iconType: 'emoji',
    label: 'Awards',
    noDataLabel: "I don't have awards to add",
    placeholder: 'Add your awards',
    addLabel: 'Add award',
  },
  {
    key: 'publication_v1',
    title: 'Publications',
    description: 'Published work',
    definition: { schemaVersion: 1, kind: 'PUBLICATION', fields: [] },
    icon: '📚',
    iconType: 'emoji',
    label: 'Publications',
    noDataLabel: "I don't have publications to add",
    placeholder: 'Add your publications',
    addLabel: 'Add publication',
  },
];
