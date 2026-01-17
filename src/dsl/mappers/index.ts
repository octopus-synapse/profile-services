/**
 * DSL Section Mappers
 *
 * Strategy pattern implementation for mapping resume data to section-specific AST.
 * Each section type has its own mapper for single responsibility.
 */

// Core interfaces and utilities
export {
  type SectionMapper,
  type ItemOverride,
  applyItemOverrides,
} from './section-mapper.interface';

// Registry
export { SectionMapperRegistry } from './section-mapper.registry';

// Individual mappers (for testing and extension)
export { ExperienceSectionMapper } from './experience.mapper';
export { EducationSectionMapper } from './education.mapper';
export { SkillsSectionMapper } from './skills.mapper';
export { LanguagesSectionMapper } from './languages.mapper';
export { ProjectsSectionMapper } from './projects.mapper';
export { CertificationsSectionMapper } from './certifications.mapper';
export { AwardsSectionMapper } from './awards.mapper';
export { InterestsSectionMapper } from './interests.mapper';
export { ReferencesSectionMapper } from './references.mapper';
export { SummarySectionMapper } from './summary.mapper';
