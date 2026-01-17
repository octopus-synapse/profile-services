/**
 * Skills Section Mapper
 *
 * Maps resume skills entries to AST skills section data.
 */

import type {
  SectionData,
  SkillItem,
} from '@octopus-synapse/profile-contracts';
import type { ResumeWithRelations } from '../dsl-compiler.service';
import {
  type SectionMapper,
  type ItemOverride,
  applyItemOverrides,
} from './section-mapper.interface';

/**
 * Map numeric skill level to human-readable string
 */
function mapSkillLevel(level: number | null): string | undefined {
  if (level === null) return undefined;
  if (level >= 5) return 'Expert';
  if (level >= 4) return 'Advanced';
  if (level >= 3) return 'Intermediate';
  if (level >= 2) return 'Elementary';
  return 'Beginner';
}

export class SkillsSectionMapper implements SectionMapper {
  readonly sectionId = 'skills';

  map(
    resume: ResumeWithRelations,
    overrides: ItemOverride[],
  ): SectionData | undefined {
    const items = applyItemOverrides(resume.skills, overrides).map(
      (skill): SkillItem => ({
        id: skill.id,
        name: skill.name,
        level: mapSkillLevel(skill.level),
        category: skill.category,
      }),
    );

    return { type: 'skills', items };
  }

  getPlaceholder(): SectionData {
    return { type: 'skills', items: [] };
  }
}
