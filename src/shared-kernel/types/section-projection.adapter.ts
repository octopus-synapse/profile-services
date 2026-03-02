/**
 * Section Projection Adapter
 *
 * Central adapter for transforming generic section data into context-specific projections.
 * This eliminates duplicate mapping logic across DSL, Export, Analytics, GDPR, etc.
 *
 * Architecture principle: One canonical mapping kernel, many presenters.
 */

import type { GenericSectionItem, SemanticKind } from './generic-section.types';

/**
 * Minimal section item interface for projection operations.
 */
export interface SectionItemInput {
  id: string;
  order: number;
  isVisible: boolean;
  content: Record<string, unknown>;
}

/**
 * Minimal section interface for projection operations.
 * Accepts both full GenericResumeSection and lightweight ProjectionSection.
 */
export interface SectionInput {
  id: string;
  semanticKind: SemanticKind;
  order: number;
  isVisible: boolean;
  items: SectionItemInput[];
}

// ============================================================================
// Field Extraction Utilities
// ============================================================================

/**
 * Safely extract a string field from content.
 */
export function getString(content: Record<string, unknown>, key: string): string | null {
  const value = content[key];
  return typeof value === 'string' ? value : null;
}

/**
 * Safely extract a required string field with fallback.
 */
export function getStringRequired(
  content: Record<string, unknown>,
  key: string,
  fallback = '',
): string {
  return getString(content, key) ?? fallback;
}

/**
 * Safely extract a number field from content.
 */
export function getNumber(content: Record<string, unknown>, key: string): number | null {
  const value = content[key];
  return typeof value === 'number' ? value : null;
}

/**
 * Safely extract a boolean field from content.
 */
export function getBoolean(content: Record<string, unknown>, key: string): boolean | null {
  const value = content[key];
  return typeof value === 'boolean' ? value : null;
}

/**
 * Safely extract a date field from content.
 */
export function getDate(content: Record<string, unknown>, key: string): Date | null {
  const value = content[key];

  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * Safely extract a string array from content.
 */
export function getStringArray(content: Record<string, unknown>, key: string): string[] {
  const value = content[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

// ============================================================================
// Raw Data Normalization
// ============================================================================

type RawSectionItem = {
  id?: string;
  order?: number;
  content: unknown;
  isVisible?: boolean;
};

type RawSection = {
  id?: string;
  sectionType: { semanticKind: string };
  items: RawSectionItem[];
  isVisible?: boolean;
  order?: number;
};

/**
 * Lightweight section for projection operations.
 * Compatible with both full GenericResumeSection and minimal projection needs.
 */
export interface ProjectionSection {
  id: string;
  semanticKind: SemanticKind;
  order: number;
  isVisible: boolean;
  items: {
    id: string;
    order: number;
    content: Record<string, unknown>;
    isVisible: boolean;
  }[];
}

/**
 * Convert raw Prisma section data to ProjectionSection[].
 */
export function toGenericSections(rawSections: RawSection[]): ProjectionSection[] {
  return rawSections.map((section, sectionIndex) => ({
    id: section.id ?? `section-${sectionIndex}`,
    semanticKind: section.sectionType.semanticKind as SemanticKind,
    order: section.order ?? sectionIndex,
    isVisible: section.isVisible ?? true,
    items: section.items.map((item, itemIndex) => ({
      id: item.id ?? `item-${sectionIndex}-${itemIndex}`,
      order: item.order ?? itemIndex,
      content: (item.content ?? {}) as Record<string, unknown>,
      isVisible: item.isVisible ?? true,
    })),
  }));
}

// ============================================================================
// Projected Item Types (Context-Specific)
// ============================================================================

/**
 * Work experience item projection.
 */
export interface ExperienceProjection {
  id: string;
  order: number;
  company: string;
  role: string;
  employmentType: string | null;
  location: string | null;
  startDate: Date;
  endDate: Date | null;
  isCurrent: boolean;
  description: string | null;
  achievements: string[];
}

/**
 * Education item projection.
 */
export interface EducationProjection {
  id: string;
  order: number;
  institution: string;
  degree: string;
  field: string | null;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean;
  gpa: string | null;
}

/**
 * Skill item projection.
 */
export interface SkillProjection {
  id: string;
  order: number;
  name: string;
  level: number | null;
  category: string | null;
}

/**
 * Language item projection.
 */
export interface LanguageProjection {
  id: string;
  order: number;
  name: string;
  level: string;
}

/**
 * Project item projection.
 */
export interface ProjectProjection {
  id: string;
  order: number;
  name: string;
  description: string | null;
  url: string | null;
  repositoryUrl: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean;
  technologies: string[];
}

/**
 * Certification item projection.
 */
export interface CertificationProjection {
  id: string;
  order: number;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate: Date | null;
  credentialUrl: string | null;
}

/**
 * Award item projection.
 */
export interface AwardProjection {
  id: string;
  order: number;
  title: string;
  issuer: string;
  date: Date;
  description: string | null;
}

/**
 * Interest item projection.
 */
export interface InterestProjection {
  id: string;
  order: number;
  name: string;
  description: string | null;
  keywords: string[];
}

/**
 * Recommendation/Reference item projection.
 */
export interface RecommendationProjection {
  id: string;
  order: number;
  author: string;
  role: string | null;
  company: string | null;
  relationship: string | null;
  text: string | null;
}

/**
 * Publication item projection.
 */
export interface PublicationProjection {
  id: string;
  order: number;
  title: string;
  publisher: string;
  date: Date | null;
  url: string | null;
  description: string | null;
}

// ============================================================================
// Section Projection Adapter
// ============================================================================

/**
 * Project a generic section item to an experience projection.
 */
export function projectExperience(item: GenericSectionItem): ExperienceProjection {
  const { content } = item;
  const endDate = getDate(content, 'endDate');

  return {
    id: item.id,
    order: item.order,
    company: getStringRequired(content, 'company'),
    role: getStringRequired(content, 'role') || getStringRequired(content, 'position'),
    employmentType: getString(content, 'employmentType'),
    location: getString(content, 'location'),
    startDate: getDate(content, 'startDate') ?? new Date(),
    endDate,
    isCurrent: getBoolean(content, 'isCurrent') ?? !endDate,
    description: getString(content, 'description'),
    achievements: getStringArray(content, 'achievements'),
  };
}

/**
 * Project a generic section item to an education projection.
 */
export function projectEducation(item: GenericSectionItem): EducationProjection {
  const { content } = item;
  const endDate = getDate(content, 'endDate');

  return {
    id: item.id,
    order: item.order,
    institution: getStringRequired(content, 'institution'),
    degree: getStringRequired(content, 'degree'),
    field: getString(content, 'field') || getString(content, 'fieldOfStudy'),
    location: getString(content, 'location'),
    startDate: getDate(content, 'startDate'),
    endDate,
    isCurrent: getBoolean(content, 'isCurrent') ?? !endDate,
    gpa: getString(content, 'gpa') || getString(content, 'grade'),
  };
}

/**
 * Project a generic section item to a skill projection.
 */
export function projectSkill(item: GenericSectionItem): SkillProjection {
  const { content } = item;

  return {
    id: item.id,
    order: item.order,
    name: getStringRequired(content, 'name'),
    level: getNumber(content, 'level'),
    category: getString(content, 'category'),
  };
}

/**
 * Project a generic section item to a language projection.
 */
export function projectLanguage(item: GenericSectionItem): LanguageProjection {
  const { content } = item;

  return {
    id: item.id,
    order: item.order,
    name: getStringRequired(content, 'name'),
    level: getStringRequired(content, 'level', 'BASIC'),
  };
}

/**
 * Project a generic section item to a project projection.
 */
export function projectProject(item: GenericSectionItem): ProjectProjection {
  const { content } = item;
  const endDate = getDate(content, 'endDate');

  return {
    id: item.id,
    order: item.order,
    name: getStringRequired(content, 'name'),
    description: getString(content, 'description'),
    url: getString(content, 'url'),
    repositoryUrl: getString(content, 'repositoryUrl'),
    startDate: getDate(content, 'startDate'),
    endDate,
    isCurrent: getBoolean(content, 'isCurrent') ?? false,
    technologies: getStringArray(content, 'technologies'),
  };
}

/**
 * Project a generic section item to a certification projection.
 */
export function projectCertification(item: GenericSectionItem): CertificationProjection {
  const { content } = item;

  return {
    id: item.id,
    order: item.order,
    name: getStringRequired(content, 'name'),
    issuer: getStringRequired(content, 'issuer'),
    issueDate: getDate(content, 'issueDate') ?? new Date(),
    expiryDate: getDate(content, 'expiryDate'),
    credentialUrl: getString(content, 'credentialUrl') || getString(content, 'url'),
  };
}

/**
 * Project a generic section item to an award projection.
 */
export function projectAward(item: GenericSectionItem): AwardProjection {
  const { content } = item;

  return {
    id: item.id,
    order: item.order,
    title: getStringRequired(content, 'title'),
    issuer: getStringRequired(content, 'issuer'),
    date: getDate(content, 'date') ?? new Date(),
    description: getString(content, 'description'),
  };
}

/**
 * Project a generic section item to an interest projection.
 */
export function projectInterest(item: GenericSectionItem): InterestProjection {
  const { content } = item;

  return {
    id: item.id,
    order: item.order,
    name: getStringRequired(content, 'name'),
    description: getString(content, 'description'),
    keywords: getStringArray(content, 'keywords'),
  };
}

/**
 * Project a generic section item to a recommendation projection.
 */
export function projectRecommendation(item: GenericSectionItem): RecommendationProjection {
  const { content } = item;

  return {
    id: item.id,
    order: item.order,
    author: getStringRequired(content, 'author') || getStringRequired(content, 'name'),
    role: getString(content, 'role') || getString(content, 'position'),
    company: getString(content, 'company'),
    relationship: getString(content, 'relationship'),
    text: getString(content, 'text') || getString(content, 'content'),
  };
}

/**
 * Project a generic section item to a publication projection.
 */
export function projectPublication(item: GenericSectionItem): PublicationProjection {
  const { content } = item;

  return {
    id: item.id,
    order: item.order,
    title: getStringRequired(content, 'title'),
    publisher: getStringRequired(content, 'publisher'),
    date: getDate(content, 'date'),
    url: getString(content, 'url'),
    description: getString(content, 'description'),
  };
}

// ============================================================================
// Section-Level Projection Functions
// ============================================================================

/**
 * Get all visible and sorted items from a section.
 */
export function getVisibleItems(section: SectionInput): SectionItemInput[] {
  return section.items.filter((item) => item.isVisible).sort((a, b) => a.order - b.order);
}

/**
 * Find a section by semantic kind.
 */
export function findSectionByKind(
  sections: SectionInput[],
  kind: SemanticKind,
): SectionInput | null {
  return sections.find((s) => s.semanticKind === kind && s.isVisible) ?? null;
}

/**
 * Find all sections matching a semantic kind.
 */
export function findAllSectionsByKind(
  sections: SectionInput[],
  kind: SemanticKind,
): SectionInput[] {
  return sections.filter((s) => s.semanticKind === kind && s.isVisible);
}

/**
 * Project all items from sections of a given kind.
 */
export function projectItemsByKind<T>(
  sections: SectionInput[],
  kind: SemanticKind,
  projector: (item: GenericSectionItem) => T,
): T[] {
  return findAllSectionsByKind(sections, kind)
    .flatMap((section) => getVisibleItems(section))
    .sort((a, b) => a.order - b.order)
    .map(projector);
}

// ============================================================================
// Aggregate Projection (Full Resume)
// ============================================================================

/**
 * Full resume projection with all section types.
 */
export interface ResumeProjection {
  experiences: ExperienceProjection[];
  education: EducationProjection[];
  skills: SkillProjection[];
  languages: LanguageProjection[];
  projects: ProjectProjection[];
  certifications: CertificationProjection[];
  awards: AwardProjection[];
  interests: InterestProjection[];
  recommendations: RecommendationProjection[];
  publications: PublicationProjection[];
}

/**
 * Project a full resume's sections into typed projections.
 */
export function projectResumeSections(sections: SectionInput[]): ResumeProjection {
  return {
    experiences: projectItemsByKind(sections, 'WORK_EXPERIENCE', projectExperience),
    education: projectItemsByKind(sections, 'EDUCATION', projectEducation),
    skills: projectItemsByKind(sections, 'SKILL_SET', projectSkill),
    languages: projectItemsByKind(sections, 'LANGUAGE', projectLanguage),
    projects: projectItemsByKind(sections, 'PROJECT', projectProject),
    certifications: projectItemsByKind(sections, 'CERTIFICATION', projectCertification),
    awards: projectItemsByKind(sections, 'AWARD', projectAward),
    interests: projectItemsByKind(sections, 'INTEREST', projectInterest),
    recommendations: projectItemsByKind(sections, 'RECOMMENDATION', projectRecommendation),
    publications: projectItemsByKind(sections, 'PUBLICATION', projectPublication),
  };
}

// ============================================================================
// Analytics-Specific Projections
// ============================================================================

/**
 * Count items per section kind.
 */
export function countItemsByKind(sections: SectionInput[]): Record<SemanticKind, number> {
  const counts: Partial<Record<SemanticKind, number>> = {};

  for (const section of sections) {
    if (!section.isVisible) continue;
    const visibleCount = section.items.filter((i) => i.isVisible).length;
    counts[section.semanticKind] = (counts[section.semanticKind] ?? 0) + visibleCount;
  }

  return counts as Record<SemanticKind, number>;
}

/**
 * Get total experience years from work experience items.
 */
export function calculateTotalExperienceYears(sections: SectionInput[]): number {
  const experiences = projectItemsByKind(sections, 'WORK_EXPERIENCE', projectExperience);

  let totalMonths = 0;
  const now = new Date();

  for (const exp of experiences) {
    const start = exp.startDate;
    const end = exp.isCurrent ? now : (exp.endDate ?? now);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    totalMonths += Math.max(0, months);
  }

  return Math.round((totalMonths / 12) * 10) / 10;
}

// ============================================================================
// Export-Specific Projections (JSON Resume format)
// ============================================================================

/**
 * Project experience to JSON Resume format.
 */
export function toJsonResumeWork(exp: ExperienceProjection) {
  return {
    name: exp.company,
    position: exp.role,
    startDate: exp.startDate.toISOString().split('T')[0],
    endDate: exp.endDate?.toISOString().split('T')[0],
    summary: exp.description ?? '',
    highlights: exp.achievements,
  };
}

/**
 * Project education to JSON Resume format.
 */
export function toJsonResumeEducation(edu: EducationProjection) {
  return {
    institution: edu.institution,
    area: edu.field ?? '',
    studyType: edu.degree,
    startDate: edu.startDate?.toISOString().split('T')[0],
    endDate: edu.endDate?.toISOString().split('T')[0],
    gpa: edu.gpa ?? undefined,
  };
}

/**
 * Project skill to JSON Resume format.
 */
export function toJsonResumeSkill(skill: SkillProjection) {
  return {
    name: skill.name,
    level: skill.level ? mapSkillLevelToString(skill.level) : undefined,
    keywords: skill.category ? [skill.category] : [],
  };
}

/**
 * Map numeric skill level to string representation.
 */
export function mapSkillLevelToString(level: number): string {
  if (level >= 5) return 'Expert';
  if (level >= 4) return 'Advanced';
  if (level >= 3) return 'Intermediate';
  if (level >= 2) return 'Elementary';
  return 'Beginner';
}

/**
 * Project language to JSON Resume format.
 */
export function toJsonResumeLanguage(lang: LanguageProjection) {
  return {
    language: lang.name,
    fluency: lang.level,
  };
}

/**
 * Project project to JSON Resume format.
 */
export function toJsonResumeProject(proj: ProjectProjection) {
  return {
    name: proj.name,
    description: proj.description ?? '',
    url: proj.url ?? undefined,
    startDate: proj.startDate?.toISOString().split('T')[0],
    endDate: proj.endDate?.toISOString().split('T')[0],
    keywords: proj.technologies,
  };
}

/**
 * Project certification to JSON Resume format.
 */
export function toJsonResumeCertificate(cert: CertificationProjection) {
  return {
    name: cert.name,
    issuer: cert.issuer,
    date: cert.issueDate.toISOString().split('T')[0],
    url: cert.credentialUrl ?? undefined,
  };
}

/**
 * Project award to JSON Resume format.
 */
export function toJsonResumeAward(award: AwardProjection) {
  return {
    title: award.title,
    awarder: award.issuer,
    date: award.date.toISOString().split('T')[0],
    summary: award.description ?? '',
  };
}

/**
 * Project publication to JSON Resume format.
 */
export function toJsonResumePublication(pub: PublicationProjection) {
  return {
    name: pub.title,
    publisher: pub.publisher,
    releaseDate: pub.date?.toISOString().split('T')[0],
    url: pub.url ?? undefined,
    summary: pub.description ?? '',
  };
}

/**
 * Project interest to JSON Resume format.
 */
export function toJsonResumeInterest(interest: InterestProjection) {
  return {
    name: interest.name,
    keywords: interest.keywords,
  };
}

/**
 * Project reference to JSON Resume format.
 */
export function toJsonResumeReference(rec: RecommendationProjection) {
  return {
    name: rec.author,
    reference: rec.text ?? '',
  };
}

// ============================================================================
// SectionProjectionAdapter - Consolidated API
// ============================================================================

/**
 * Adapter object that consolidates all projection functions.
 * Provides a clean namespace for import and use.
 */
export const SectionProjectionAdapter = {
  /** Convert raw Prisma section data to SectionInput[] */
  toGenericSections,

  /** Project experiences from sections */
  projectExperience(sections: SectionInput[]): ExperienceProjection[] {
    return projectItemsByKind(sections, 'WORK_EXPERIENCE', projectExperience);
  },

  /** Project education from sections */
  projectEducation(sections: SectionInput[]): EducationProjection[] {
    return projectItemsByKind(sections, 'EDUCATION', projectEducation);
  },

  /** Project skills from sections */
  projectSkills(sections: SectionInput[]): SkillProjection[] {
    return projectItemsByKind(sections, 'SKILL_SET', projectSkill);
  },

  /** Project languages from sections */
  projectLanguages(sections: SectionInput[]): LanguageProjection[] {
    return projectItemsByKind(sections, 'LANGUAGE', projectLanguage);
  },

  /** Project projects from sections */
  projectProjects(sections: SectionInput[]): ProjectProjection[] {
    return projectItemsByKind(sections, 'PROJECT', projectProject);
  },

  /** Project certifications from sections */
  projectCertifications(sections: SectionInput[]): CertificationProjection[] {
    return projectItemsByKind(sections, 'CERTIFICATION', projectCertification);
  },

  /** Project awards from sections */
  projectAwards(sections: SectionInput[]): AwardProjection[] {
    return projectItemsByKind(sections, 'AWARD', projectAward);
  },

  /** Project interests from sections */
  projectInterests(sections: SectionInput[]): InterestProjection[] {
    return projectItemsByKind(sections, 'INTEREST', projectInterest);
  },

  /** Project recommendations from sections */
  projectRecommendations(sections: SectionInput[]): RecommendationProjection[] {
    return projectItemsByKind(sections, 'RECOMMENDATION', projectRecommendation);
  },

  /** Project publications from sections */
  projectPublications(sections: SectionInput[]): PublicationProjection[] {
    return projectItemsByKind(sections, 'PUBLICATION', projectPublication);
  },

  /** Project full resume sections */
  projectAll: projectResumeSections,

  /** Count items by kind */
  countByKind: countItemsByKind,
} as const;
