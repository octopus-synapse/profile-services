/**
 * Query Facade Ports
 *
 * Contracts exposed by the specialized query services so that
 * TechSkillsQueryService depends on abstractions instead of concrete siblings.
 */

import type { ProgrammingLanguage } from '../../dto/programming-language.dto';
import type { TechArea } from '../../dto/tech-area.dto';
import type { TechNiche } from '../../dto/tech-niche.dto';
import type { TechSkill } from '../../dto/tech-skill.dto';
import type { SkillType, TechAreaType } from '../../interfaces';

export abstract class TechAreaQueryPort {
  abstract getAllAreas(): Promise<TechArea[]>;
}

export abstract class TechNicheQueryPort {
  abstract getAllNiches(): Promise<TechNiche[]>;
  abstract getNichesByArea(areaType: TechAreaType): Promise<TechNiche[]>;
}

export abstract class LanguageQueryPort {
  abstract getAllLanguages(): Promise<ProgrammingLanguage[]>;
  abstract searchLanguages(query: string, limit?: number): Promise<ProgrammingLanguage[]>;
}

export abstract class SkillQueryPort {
  abstract getAllSkills(): Promise<TechSkill[]>;
  abstract getSkillsByNiche(nicheSlug: string): Promise<TechSkill[]>;
  abstract getSkillsByType(type: SkillType, limit?: number): Promise<TechSkill[]>;
}

export abstract class SkillSearchPort {
  abstract searchSkills(query: string, limit?: number): Promise<TechSkill[]>;
}
