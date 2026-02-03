import type { Skill } from '@prisma/client';
import {
  applyOverrides,
  mapSkillLevel,
  type SkillItem,
  type ItemOverride,
  type SectionData,
} from './shared';

export function compileSkills(
  skills: Skill[],
  overrides: ItemOverride[],
): SectionData {
  const items = applyOverrides(skills, overrides).map(
    (skill): SkillItem => ({
      id: skill.id,
      name: skill.name,
      level: mapSkillLevel(skill.level),
      category: skill.category,
    }),
  );
  return { type: 'skills', items };
}
