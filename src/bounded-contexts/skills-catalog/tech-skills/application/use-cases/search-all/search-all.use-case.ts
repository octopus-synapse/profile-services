import type { LoggerPort } from '@/shared-kernel';
import type { ProgrammingLanguage } from '../../../dto/programming-language.schema';
import type { TechSkill } from '../../../dto/tech-skill.schema';
import type { SearchLanguagesUseCase } from '../search-languages/search-languages.use-case';
import type { SearchSkillsUseCase } from '../search-skills/search-skills.use-case';

export class SearchAllUseCase {
  constructor(
    private readonly searchLanguages: SearchLanguagesUseCase,
    private readonly searchSkills: SearchSkillsUseCase,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    query: string,
    limit = 20,
  ): Promise<{ languages: ProgrammingLanguage[]; skills: TechSkill[] }> {
    const [languages, skills] = await Promise.all([
      this.searchLanguages.execute(query, Math.floor(limit / 2)),
      this.searchSkills.execute(query, Math.floor(limit / 2)),
    ]);

    return { languages, skills };
  }
}
