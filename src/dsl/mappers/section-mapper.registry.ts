/**
 * Section Mapper Registry
 *
 * Central registry for all section mappers.
 * Uses strategy pattern to delegate section mapping to appropriate handlers.
 *
 * Design Rationale:
 * - Open/Closed: Add new sections by registering new mappers
 * - Single point of access for all section mapping
 * - Default placeholder mappers for unknown sections
 */

import type { SectionData } from '@octopus-synapse/profile-contracts';
import type { SectionMapper, ItemOverride } from './section-mapper.interface';
import type { ResumeWithRelations } from '../dsl-compiler.service';

// Import all mappers
import { ExperienceSectionMapper } from './experience.mapper';
import { EducationSectionMapper } from './education.mapper';
import { SkillsSectionMapper } from './skills.mapper';
import { LanguagesSectionMapper } from './languages.mapper';
import { ProjectsSectionMapper } from './projects.mapper';
import { CertificationsSectionMapper } from './certifications.mapper';
import { AwardsSectionMapper } from './awards.mapper';
import { InterestsSectionMapper } from './interests.mapper';
import { ReferencesSectionMapper } from './references.mapper';
import { SummarySectionMapper } from './summary.mapper';

/**
 * Default mapper for sections without specific implementation
 */
class DefaultSectionMapper implements SectionMapper {
  constructor(
    readonly sectionId: string,
    private readonly placeholderType:
      | 'objective'
      | 'volunteer'
      | 'publications'
      | 'custom',
  ) {}

  map(): SectionData | undefined {
    return undefined;
  }

  getPlaceholder(): SectionData {
    // Handle data-based sections vs item-based sections
    switch (this.placeholderType) {
      case 'objective':
        return { type: 'objective', data: { content: '' } };
      case 'volunteer':
        return { type: 'volunteer', items: [] };
      case 'publications':
        return { type: 'publications', items: [] };
      case 'custom':
      default:
        return { type: 'custom', items: [] };
    }
  }
}

/**
 * Section Mapper Registry
 *
 * Provides centralized access to section mappers via strategy pattern.
 */
export class SectionMapperRegistry {
  private readonly mappers: Map<string, SectionMapper>;

  constructor() {
    this.mappers = new Map();

    // Register all known mappers
    this.register(new ExperienceSectionMapper());
    this.register(new EducationSectionMapper());
    this.register(new SkillsSectionMapper());
    this.register(new LanguagesSectionMapper());
    this.register(new ProjectsSectionMapper());
    this.register(new CertificationsSectionMapper());
    this.register(new AwardsSectionMapper());
    this.register(new InterestsSectionMapper());
    this.register(new ReferencesSectionMapper());
    this.register(new SummarySectionMapper());

    // Register default mappers for known section types without data
    this.register(new DefaultSectionMapper('objective', 'objective'));
    this.register(new DefaultSectionMapper('volunteer', 'volunteer'));
    this.register(new DefaultSectionMapper('publications', 'publications'));
  }

  /**
   * Register a section mapper
   */
  register(mapper: SectionMapper): void {
    this.mappers.set(mapper.sectionId, mapper);
  }

  /**
   * Get mapper for a section, or default if not found
   */
  get(sectionId: string): SectionMapper {
    const mapper = this.mappers.get(sectionId);
    if (mapper) {
      return mapper;
    }
    // Return a default mapper for unknown sections
    return new DefaultSectionMapper(sectionId, 'custom');
  }

  /**
   * Check if a mapper exists for a section
   */
  has(sectionId: string): boolean {
    return this.mappers.has(sectionId);
  }

  /**
   * Map section data using the appropriate mapper
   */
  mapSection(
    sectionId: string,
    resume: ResumeWithRelations,
    overrides: ItemOverride[],
  ): SectionData | undefined {
    return this.get(sectionId).map(resume, overrides);
  }

  /**
   * Get placeholder data for a section
   */
  getPlaceholder(sectionId: string): SectionData {
    return this.get(sectionId).getPlaceholder();
  }
}
